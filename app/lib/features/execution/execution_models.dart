// Hand-maintained Dart mirror of backend/src/modules/execution's response shapes — same
// no-codegen convention as core/api/models.dart.

class AssignmentPjpRow {
  final String id;
  final DateTime date;
  final String locationName;
  final String stateName;
  final String districtName;
  final String tehsilName;
  final double? latitude;
  final double? longitude;

  AssignmentPjpRow({
    required this.id,
    required this.date,
    required this.locationName,
    required this.stateName,
    required this.districtName,
    required this.tehsilName,
    this.latitude,
    this.longitude,
  });

  factory AssignmentPjpRow.fromJson(Map<String, dynamic> json) => AssignmentPjpRow(
        id: json['id'] as String,
        date: DateTime.parse(json['date'] as String),
        locationName: json['locationName'] as String,
        stateName: json['stateName'] as String,
        districtName: json['districtName'] as String,
        tehsilName: json['tehsilName'] as String,
        latitude: json['latitude'] != null ? double.parse(json['latitude'].toString()) : null,
        longitude: json['longitude'] != null ? double.parse(json['longitude'].toString()) : null,
      );
}

class MyAssignment {
  final String id;
  final String campaignId;
  final String campaignName;
  final String status;
  final DateTime assignmentDate;
  final AssignmentPjpRow? pjpRow;

  MyAssignment({
    required this.id,
    required this.campaignId,
    required this.campaignName,
    required this.status,
    required this.assignmentDate,
    this.pjpRow,
  });

  factory MyAssignment.fromJson(Map<String, dynamic> json) => MyAssignment(
        id: json['id'] as String,
        campaignId: json['campaignId'] as String,
        campaignName: (json['campaign'] as Map<String, dynamic>)['name'] as String,
        status: json['status'] as String,
        assignmentDate: DateTime.parse(json['assignmentDate'] as String),
        pjpRow: json['pjpRow'] != null ? AssignmentPjpRow.fromJson(json['pjpRow'] as Map<String, dynamic>) : null,
      );
}

class QuestionOption {
  final String id;
  final String label;
  final String value;

  QuestionOption({required this.id, required this.label, required this.value});

  factory QuestionOption.fromJson(Map<String, dynamic> json) =>
      QuestionOption(id: json['id'] as String, label: json['label'] as String, value: json['value'] as String);
}

class FormQuestion {
  final String id;
  final String fieldType;
  final String label;
  final String? helpText;
  final bool isMandatory;
  final List<QuestionOption> options;

  FormQuestion({
    required this.id,
    required this.fieldType,
    required this.label,
    this.helpText,
    required this.isMandatory,
    required this.options,
  });

  factory FormQuestion.fromJson(Map<String, dynamic> json) => FormQuestion(
        id: json['id'] as String,
        fieldType: json['fieldType'] as String,
        label: json['label'] as String,
        helpText: json['helpText'] as String?,
        isMandatory: json['isMandatory'] as bool,
        options: (json['options'] as List<dynamic>? ?? [])
            .map((o) => QuestionOption.fromJson(o as Map<String, dynamic>))
            .toList(),
      );
}

class FormSection {
  final String id;
  final String title;
  final List<FormQuestion> questions;

  FormSection({required this.id, required this.title, required this.questions});

  factory FormSection.fromJson(Map<String, dynamic> json) => FormSection(
        id: json['id'] as String,
        title: json['title'] as String,
        questions: (json['questions'] as List<dynamic>? ?? [])
            .map((q) => FormQuestion.fromJson(q as Map<String, dynamic>))
            .toList(),
      );
}

class ConditionalRule {
  final String triggerQuestionId;
  final dynamic triggerValueJson;
  final String action;
  final String targetQuestionId;

  ConditionalRule({
    required this.triggerQuestionId,
    required this.triggerValueJson,
    required this.action,
    required this.targetQuestionId,
  });

  factory ConditionalRule.fromJson(Map<String, dynamic> json) => ConditionalRule(
        triggerQuestionId: json['triggerQuestionId'] as String,
        triggerValueJson: json['triggerValueJson'],
        action: json['action'] as String,
        targetQuestionId: json['targetQuestionId'] as String,
      );
}

class MilestoneForm {
  final List<FormSection> sections;
  final List<ConditionalRule> conditionalRules;

  MilestoneForm({required this.sections, required this.conditionalRules});

  factory MilestoneForm.fromJson(Map<String, dynamic> json) => MilestoneForm(
        sections: (json['sections'] as List<dynamic>? ?? [])
            .map((s) => FormSection.fromJson(s as Map<String, dynamic>))
            .toList(),
        conditionalRules: (json['conditionalRules'] as List<dynamic>? ?? [])
            .map((r) => ConditionalRule.fromJson(r as Map<String, dynamic>))
            .toList(),
      );
}

class Milestone {
  final String id;
  final String name;
  final int mandatoryPhotoCount;
  final bool mandatoryGps;
  final bool mandatorySignature;
  final MilestoneForm? formVersion;

  Milestone({
    required this.id,
    required this.name,
    required this.mandatoryPhotoCount,
    required this.mandatoryGps,
    required this.mandatorySignature,
    this.formVersion,
  });

  factory Milestone.fromJson(Map<String, dynamic> json) => Milestone(
        id: json['id'] as String,
        name: json['name'] as String,
        mandatoryPhotoCount: json['mandatoryPhotoCount'] as int,
        mandatoryGps: json['mandatoryGps'] as bool,
        mandatorySignature: json['mandatorySignature'] as bool,
        formVersion: json['formVersion'] != null ? MilestoneForm.fromJson(json['formVersion'] as Map<String, dynamic>) : null,
      );
}

class ActivityInstance {
  final String id;
  final String status;
  final DateTime plannedDate;

  ActivityInstance({required this.id, required this.status, required this.plannedDate});

  factory ActivityInstance.fromJson(Map<String, dynamic> json) => ActivityInstance(
        id: json['id'] as String,
        status: json['status'] as String,
        plannedDate: DateTime.parse(json['plannedDate'] as String),
      );
}

class MediaRecord {
  final String id;
  final String sha256Hash;

  MediaRecord({required this.id, required this.sha256Hash});

  factory MediaRecord.fromJson(Map<String, dynamic> json) =>
      MediaRecord(id: json['id'] as String, sha256Hash: json['sha256Hash'] as String);
}

class ActivityBundle {
  final ActivityInstance activity;
  final Milestone? milestone;
  final bool hasCheckIn;
  final bool hasCheckOut;
  final List<MediaRecord> media;
  final bool hasFormResponse;

  ActivityBundle({
    required this.activity,
    this.milestone,
    required this.hasCheckIn,
    required this.hasCheckOut,
    required this.media,
    required this.hasFormResponse,
  });

  factory ActivityBundle.fromJson(Map<String, dynamic> json) => ActivityBundle(
        activity: ActivityInstance.fromJson(json['activity'] as Map<String, dynamic>),
        milestone: json['milestone'] != null ? Milestone.fromJson(json['milestone'] as Map<String, dynamic>) : null,
        hasCheckIn: json['checkIn'] != null,
        hasCheckOut: json['checkOut'] != null,
        media: (json['media'] as List<dynamic>? ?? []).map((m) => MediaRecord.fromJson(m as Map<String, dynamic>)).toList(),
        hasFormResponse: json['formResponse'] != null,
      );
}

class CheckInResult {
  final double? distanceFromPlannedMeters;
  final int toleranceMeters;
  final bool withinTolerance;
  final bool alreadyCheckedIn;

  CheckInResult({
    this.distanceFromPlannedMeters,
    required this.toleranceMeters,
    required this.withinTolerance,
    required this.alreadyCheckedIn,
  });

  factory CheckInResult.fromJson(Map<String, dynamic> json) {
    final checkIn = json['checkIn'] as Map<String, dynamic>?;
    final rawDistance = checkIn?['distanceFromPlannedMeters'];
    return CheckInResult(
      distanceFromPlannedMeters: rawDistance != null ? double.parse(rawDistance.toString()) : null,
      toleranceMeters: json['toleranceMeters'] as int? ?? 250,
      withinTolerance: json['withinTolerance'] as bool? ?? true,
      alreadyCheckedIn: json['alreadyCheckedIn'] as bool? ?? false,
    );
  }
}
