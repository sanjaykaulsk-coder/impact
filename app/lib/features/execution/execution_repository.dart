import '../../core/api/api_client.dart';
import 'execution_models.dart';

class ExecutionRepository {
  final ApiClient api;
  ExecutionRepository({required this.api});

  Future<List<MyAssignment>> myAssignments() async {
    final json = await api.get('/me/assignments') as List<dynamic>;
    return json.map((e) => MyAssignment.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<ActivityBundle> getOrCreateActivity(String campaignId, String assignmentId) async {
    final json = await api.get('/campaigns/$campaignId/assignments/$assignmentId/activity');
    return ActivityBundle.fromJson(json as Map<String, dynamic>);
  }

  Future<ActivityBundle> getActivity(String campaignId, String activityInstanceId) async {
    final json = await api.get('/campaigns/$campaignId/activity-instances/$activityInstanceId');
    return ActivityBundle.fromJson(json as Map<String, dynamic>);
  }

  Future<CheckInResult> checkIn(
    String campaignId,
    String activityInstanceId, {
    required double latitude,
    required double longitude,
    double? accuracyMeters,
    required DateTime deviceTimestamp,
  }) async {
    final json = await api.post('/campaigns/$campaignId/activity-instances/$activityInstanceId/check-in', {
      'latitude': latitude,
      'longitude': longitude,
      'accuracyMeters': ?accuracyMeters,
      'deviceTimestamp': deviceTimestamp.toIso8601String(),
    });
    return CheckInResult.fromJson(json as Map<String, dynamic>);
  }

  // Chunked, resumable upload (docs/architecture/05) — a single-shot upload doesn't survive a
  // real phone's real Wi-Fi dropping mid-transfer; see SyncService for the chunk loop that calls
  // these three in sequence and can resume from wherever the last attempt left off.
  Future<MediaUploadInitResult> initMediaUpload(
    String campaignId,
    String activityInstanceId, {
    required String sha256Hash,
    required int sizeBytes,
    required String mimeType,
    required double latitude,
    required double longitude,
    required DateTime capturedAt,
    String? deviceId,
  }) async {
    final json = await api.post('/campaigns/$campaignId/activity-instances/$activityInstanceId/media/init', {
      'sha256Hash': sha256Hash,
      'sizeBytes': sizeBytes,
      'mimeType': mimeType,
      'latitude': latitude,
      'longitude': longitude,
      'capturedAt': capturedAt.toIso8601String(),
      'deviceId': ?deviceId,
    });
    return MediaUploadInitResult.fromJson(json as Map<String, dynamic>);
  }

  Future<List<int>> uploadMediaChunk(
    String campaignId,
    String activityInstanceId,
    String sessionId,
    int index,
    List<int> chunkBytes,
  ) async {
    final json = await api.postMultipart(
      '/campaigns/$campaignId/activity-instances/$activityInstanceId/media/sessions/$sessionId/chunks/$index',
      fileBytes: chunkBytes,
      fileFieldName: 'chunk',
      fileName: 'chunk-$index',
      mimeType: 'application/octet-stream',
      fields: const {},
    );
    return ((json as Map<String, dynamic>)['receivedChunks'] as List<dynamic>).cast<int>();
  }

  Future<MediaRecord> completeMediaUpload(String campaignId, String activityInstanceId, String sessionId) async {
    final json =
        await api.post('/campaigns/$campaignId/activity-instances/$activityInstanceId/media/sessions/$sessionId/complete', const {});
    return MediaRecord.fromJson(json as Map<String, dynamic>);
  }

  Future<void> submitMilestoneResponse(
    String campaignId,
    String activityInstanceId, {
    required String clientRef,
    String? deviceId,
    required List<Map<String, dynamic>> fieldResponses,
  }) async {
    await api.post('/campaigns/$campaignId/activity-instances/$activityInstanceId/milestone-response', {
      'clientRef': clientRef,
      'deviceId': ?deviceId,
      'fieldResponses': fieldResponses,
    });
  }

  Future<void> checkOut(
    String campaignId,
    String activityInstanceId, {
    required double latitude,
    required double longitude,
    required DateTime deviceTimestamp,
  }) async {
    await api.post('/campaigns/$campaignId/activity-instances/$activityInstanceId/check-out', {
      'latitude': latitude,
      'longitude': longitude,
      'deviceTimestamp': deviceTimestamp.toIso8601String(),
    });
  }

  /// Puts a rejected activity back in the supervisor's queue after its flagged content has been
  /// redone. Called directly (not via the offline outbox) — seeing the rejection in the first
  /// place already required connectivity, and this is a lightweight follow-up action.
  Future<void> resubmit(String campaignId, String activityInstanceId) async {
    await api.post('/campaigns/$campaignId/activity-instances/$activityInstanceId/resubmit', const {});
  }

  /// Marks one pre-activity SOP checklist item (spec §12). Direct call like resubmit() — not
  /// routed through the offline outbox; see A-05x in ASSUMPTIONS.md for that known limitation.
  Future<void> markSopChecklistItem(
    String campaignId,
    String activityInstanceId,
    String itemId, {
    required String status,
  }) async {
    await api.post(
      '/campaigns/$campaignId/activity-instances/$activityInstanceId/sop-checklist/$itemId',
      {'status': status},
    );
  }

  /// Batch of GPS fixes captured while a visit is underway (Stage 4.1's backend, spec §14). Called
  /// directly, not via the offline outbox — this is a best-effort background enhancement, not a
  /// user-initiated action the outbox's retry guarantees are meant for; see ASSUMPTIONS.md A-061.
  Future<GpsIngestResult> ingestGpsPoints(
    String campaignId,
    String activityInstanceId,
    List<Map<String, dynamic>> points,
  ) async {
    final json = await api.post(
      '/campaigns/$campaignId/activity-instances/$activityInstanceId/gps-points',
      {'points': points},
    );
    return GpsIngestResult.fromJson(json as Map<String, dynamic>);
  }

  /// Field worker's explanation for an off-plan reading (spec §14) — never blocks or pauses the
  /// activity, submitted whether prompted by an on-device warning or reported by the worker
  /// themselves.
  Future<DeviationRequestRecord> submitDeviationRequest(
    String campaignId,
    String activityInstanceId, {
    required String deviationType,
    required String reason,
    String? remarks,
    double? distanceMeters,
  }) async {
    final json = await api.post('/campaigns/$campaignId/activity-instances/$activityInstanceId/deviation-requests', {
      'deviationType': deviationType,
      'reason': reason,
      'remarks': ?remarks,
      'distanceMeters': ?distanceMeters,
    });
    return DeviationRequestRecord.fromJson(json as Map<String, dynamic>);
  }

  /// Today's day-start/day-end status (S4.3, spec §34) — independent of any specific assignment.
  Future<TodayAttendance> todayAttendance(String campaignId) async {
    final json = await api.get('/campaigns/$campaignId/attendance/today');
    return TodayAttendance.fromJson(json as Map<String, dynamic>);
  }

  Future<AttendanceRecord> markDayStart(String campaignId, {double? latitude, double? longitude}) async {
    final json = await api.post('/campaigns/$campaignId/attendance/day-start', {
      'latitude': ?latitude,
      'longitude': ?longitude,
    });
    return AttendanceRecord.fromJson(json as Map<String, dynamic>);
  }

  Future<AttendanceRecord> markDayEnd(String campaignId, {double? latitude, double? longitude}) async {
    final json = await api.post('/campaigns/$campaignId/attendance/day-end', {
      'latitude': ?latitude,
      'longitude': ?longitude,
    });
    return AttendanceRecord.fromJson(json as Map<String, dynamic>);
  }
}
