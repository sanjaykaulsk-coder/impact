import 'dart:convert';
import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';

part 'outbox_database.g.dart';

/// One row per queued field action (check-in, check-out, a photo, or a milestone form
/// submission) — CLAUDE.md's locked offline-storage choice (Drift/SQLite). A generalized single
/// table rather than one table per action type: all four share the same lifecycle (pending →
/// syncing → synced/failed), so one table + one sync loop covers all of them.
class OutboxItems extends Table {
  TextColumn get id => text()();
  TextColumn get type => text()(); // checkIn | checkOut | media | milestoneResponse
  TextColumn get campaignId => text()();
  TextColumn get activityInstanceId => text()();
  TextColumn get payloadJson => text()();
  TextColumn get filePath => text().nullable()(); // media items only — the captured photo on disk
  TextColumn get status => text().withDefault(const Constant('pending'))();
  TextColumn get errorMessage => text().nullable()();
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  // Exponential-backoff gate (docs/architecture/05: "exponential backoff with jitter, 30s -> 2m ->
  // 10m -> 30m, cap 6h"). Null means due immediately. Automatic sync passes (WorkManager,
  // connectivity change) skip anything not yet due; an explicit "Sync now" tap bypasses this.
  DateTimeColumn get nextRetryAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

@DriftDatabase(tables: [OutboxItems])
class OutboxDatabase extends _$OutboxDatabase {
  OutboxDatabase() : super(_openConnection());
  OutboxDatabase.withExecutor(super.e);

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (m) => m.createAll(),
        onUpgrade: (m, from, to) async {
          if (from < 2) {
            await m.addColumn(outboxItems, outboxItems.retryCount);
            await m.addColumn(outboxItems, outboxItems.nextRetryAt);
          }
        },
      );

  static QueryExecutor _openConnection() {
    return LazyDatabase(() async {
      final dir = await getApplicationDocumentsDirectory();
      final file = File(p.join(dir.path, 'field_command_outbox.sqlite'));
      return NativeDatabase.createInBackground(file);
    });
  }

  Stream<List<OutboxItem>> watchForActivity(String activityInstanceId) {
    return (select(outboxItems)..where((t) => t.activityInstanceId.equals(activityInstanceId))).watch();
  }

  /// Ordered oldest-first: a plain, deterministic FIFO base ordering that SyncService's
  /// dependency check (a milestone's check-out must wait for its own media/form) relies on rather
  /// than an unspecified query order — the ordering bug this replaced meant check-out could be
  /// attempted, and rejected by the server, before its own photo had synced.
  Future<List<OutboxItem>> pendingOrFailedItems() {
    return (select(outboxItems)
          ..where((t) => t.status.equals('pending') | t.status.equals('failed'))
          ..orderBy([(t) => OrderingTerm.asc(t.createdAt)]))
        .get();
  }

  Future<String> enqueue({
    required String type,
    required String campaignId,
    required String activityInstanceId,
    required Map<String, dynamic> payload,
    String? filePath,
  }) async {
    final id = const Uuid().v4();
    await into(outboxItems).insert(
      OutboxItemsCompanion.insert(
        id: id,
        type: type,
        campaignId: campaignId,
        activityInstanceId: activityInstanceId,
        payloadJson: jsonEncode(payload),
        filePath: Value(filePath),
      ),
    );
    return id;
  }

  Future<void> markSyncing(String id) => (update(outboxItems)..where((t) => t.id.equals(id))).write(
        OutboxItemsCompanion(
          status: const Value('syncing'),
          errorMessage: const Value(null),
          updatedAt: Value(DateTime.now()),
        ),
      );

  Future<void> markSynced(String id) => (update(outboxItems)..where((t) => t.id.equals(id))).write(
        OutboxItemsCompanion(
          status: const Value('synced'),
          errorMessage: const Value(null),
          retryCount: const Value(0),
          nextRetryAt: const Value(null),
          updatedAt: Value(DateTime.now()),
        ),
      );

  Future<void> markFailed(String id, String error, {required int retryCount, DateTime? nextRetryAt}) =>
      (update(outboxItems)..where((t) => t.id.equals(id))).write(
        OutboxItemsCompanion(
          status: const Value('failed'),
          errorMessage: Value(error),
          retryCount: Value(retryCount),
          nextRetryAt: Value(nextRetryAt),
          updatedAt: Value(DateTime.now()),
        ),
      );

  /// Discards a failed item so its slot (e.g. a photo requirement) can be filled again — used
  /// when the queued attempt itself was the problem (a bad capture) rather than a transient sync
  /// failure that a plain retry would fix.
  Future<void> discard(String id) async {
    final row = await (select(outboxItems)..where((t) => t.id.equals(id))).getSingleOrNull();
    if (row?.filePath != null) {
      final file = File(row!.filePath!);
      if (await file.exists()) await file.delete();
    }
    await (delete(outboxItems)..where((t) => t.id.equals(id))).go();
  }
}
