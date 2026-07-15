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

  Future<MediaRecord> uploadMedia(
    String campaignId,
    String activityInstanceId, {
    required List<int> fileBytes,
    required String fileName,
    required String mimeType,
    required double latitude,
    required double longitude,
    required DateTime capturedAt,
    String? deviceId,
  }) async {
    final json = await api.postMultipart(
      '/campaigns/$campaignId/activity-instances/$activityInstanceId/media',
      fileBytes: fileBytes,
      fileFieldName: 'file',
      fileName: fileName,
      mimeType: mimeType,
      fields: {
        'latitude': latitude.toString(),
        'longitude': longitude.toString(),
        'capturedAt': capturedAt.toIso8601String(),
        'deviceId': ?deviceId,
      },
    );
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
}
