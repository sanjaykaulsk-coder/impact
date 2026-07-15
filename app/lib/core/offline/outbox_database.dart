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
  int get schemaVersion => 1;

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

  Future<List<OutboxItem>> pendingOrFailedItems() {
    return (select(outboxItems)..where((t) => t.status.equals('pending') | t.status.equals('failed'))).get();
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
        OutboxItemsCompanion(status: const Value('synced'), errorMessage: const Value(null), updatedAt: Value(DateTime.now())),
      );

  Future<void> markFailed(String id, String error) => (update(outboxItems)..where((t) => t.id.equals(id))).write(
        OutboxItemsCompanion(status: const Value('failed'), errorMessage: Value(error), updatedAt: Value(DateTime.now())),
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
