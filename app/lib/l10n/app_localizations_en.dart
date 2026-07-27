// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Impact Field Command';

  @override
  String get fieldApplicationTagline => 'Field application';

  @override
  String get mobileNumberLabel => 'Mobile number';

  @override
  String get mobileNumberHint => '10-digit mobile number';

  @override
  String get mobileNumberValidationError =>
      'Enter a valid 10-digit mobile number';

  @override
  String get sendingOtp => 'Sending OTP…';

  @override
  String get sendOtp => 'Send OTP';

  @override
  String get verifyOtpTitle => 'Verify OTP';

  @override
  String codeSentTo(Object mobile) {
    return 'Code sent to $mobile';
  }

  @override
  String get mockNoSmsSent => 'MOCK — NO SMS SENT';

  @override
  String devOtpMessage(Object code) {
    return 'Development mode: your OTP is $code (shown here only because OTP_PROVIDER=mock).';
  }

  @override
  String get otpCodeLabel => 'OTP code';

  @override
  String get otpCodeValidationError => 'Enter the OTP code';

  @override
  String get verifying => 'Verifying…';

  @override
  String get verifyAndSignIn => 'Verify & sign in';

  @override
  String get deviceVerifiedLoading =>
      'Device verified. Loading your campaigns…';

  @override
  String get devicePendingDefaultMessage =>
      'This device needs approval before it can be used.';

  @override
  String get devicePendingTitle => 'Device pending approval';

  @override
  String get backToLogin => 'Back to login';

  @override
  String get selectCampaignTitle => 'Select campaign';

  @override
  String helloUser(Object name) {
    return 'Hello, $name';
  }

  @override
  String accessToCampaigns(Object count) {
    return 'You have access to $count campaign(s).';
  }

  @override
  String get noActiveCampaignRole =>
      'No active campaign role yet. Contact your administrator.';

  @override
  String clientRoleLine(Object client, Object role) {
    return '$client · $role';
  }

  @override
  String couldNotStartDay(Object error) {
    return 'Could not start your day: $error';
  }

  @override
  String couldNotEndDay(Object error) {
    return 'Could not end your day: $error';
  }

  @override
  String get switchCampaign => 'Switch campaign';

  @override
  String get defaultCampaignTitle => 'Campaign';

  @override
  String couldNotLoadBranding(Object error) {
    return 'Could not load campaign branding: $error';
  }

  @override
  String get signedInAs => 'Signed in as';

  @override
  String get roleLabel => 'Role';

  @override
  String get escalationContact => 'Escalation contact';

  @override
  String get viewRouteMap => 'View Route Map';

  @override
  String get todaysAssignments => 'Today\'s assignments';

  @override
  String couldNotLoadAssignments(Object error) {
    return 'Could not load assignments: $error';
  }

  @override
  String get noAssignmentsYet => 'No assignments for this campaign yet.';

  @override
  String get assignmentDefaultTitle => 'Assignment';

  @override
  String assignmentSubtitleWithLocation(
    Object district,
    Object state,
    Object status,
  ) {
    return '$district, $state — $status';
  }

  @override
  String get haventStartedDay => 'You haven\'t started your day yet';

  @override
  String dayStartedAt(Object time) {
    return 'Day started at $time';
  }

  @override
  String dayStartedEnded(Object startTime, Object endTime) {
    return 'Day started $startTime · ended $endTime';
  }

  @override
  String get working => 'Working…';

  @override
  String get startMyDay => 'Start my day';

  @override
  String get endMyDay => 'End my day';

  @override
  String get deviationOutsideRadius => 'Outside permitted radius';

  @override
  String get deviationUnplanned => 'Unplanned location';

  @override
  String get deviationSkipped => 'Skipped location';

  @override
  String get deviationWrongSequence => 'Wrong sequence';

  @override
  String get deviationLateArrival => 'Late arrival';

  @override
  String get deviationEarlyDeparture => 'Early departure';

  @override
  String get deviationUnplannedStoppage => 'Unplanned stoppage';

  @override
  String get deviationGpsDisabled => 'GPS disabled/unavailable';

  @override
  String get deviationAbnormalSpeed => 'Abnormal speed';

  @override
  String get deviationSuspectedManipulation =>
      'Suspected location manipulation';

  @override
  String get sentToSupervisor => 'Sent to your supervisor for review.';

  @override
  String get couldNotRefresh =>
      'Could not refresh from the server — showing what\'s saved on this device.';

  @override
  String checkInFailed(Object error) {
    return 'Check-in failed: $error';
  }

  @override
  String checkOutFailed(Object error) {
    return 'Check-out failed: $error';
  }

  @override
  String couldNotUpdateChecklist(Object error) {
    return 'Could not update checklist: $error';
  }

  @override
  String couldNotResubmit(Object error) {
    return 'Could not resubmit: $error';
  }

  @override
  String distanceFromPlanned(Object distance) {
    return 'You appear to be about ${distance}m from the planned location — explain why?';
  }

  @override
  String get awayFromPlanned =>
      'You appear to be away from the planned location — explain why?';

  @override
  String get unusualLocationJump =>
      'An unusual location jump was detected — explain why?';

  @override
  String get unusualSpeed =>
      'An unusually high speed was detected — explain why?';

  @override
  String get somethingUnusual =>
      'Something about this visit looked unusual — explain why?';

  @override
  String get activityTitle => 'Activity';

  @override
  String get fieldActivityDefault => 'Field activity';

  @override
  String statusLabel(Object status) {
    return 'Status: $status';
  }

  @override
  String get sentBackBySupervisor => 'Sent back by your supervisor';

  @override
  String get noReasonGiven => 'No reason given.';

  @override
  String get waitingForReview =>
      'Waiting for your supervisor to review this visit.';

  @override
  String get approvedBySupervisor => 'Approved by your supervisor.';

  @override
  String get explain => 'Explain';

  @override
  String get preActivityChecklist => 'Pre-activity checklist';

  @override
  String get gpsCheckIn => 'GPS check-in';

  @override
  String get required => 'Required';

  @override
  String get notRequiredForMilestone => 'Not required for this milestone';

  @override
  String get photos => 'Photos';

  @override
  String photosCountCaptured(Object count, Object requiredCount) {
    return '$count of $requiredCount captured';
  }

  @override
  String get outletVisitForm => 'Outlet Visit form';

  @override
  String get submitted => 'Submitted';

  @override
  String get notSubmittedYet => 'Not submitted yet';

  @override
  String get checkIn => 'Check in';

  @override
  String get retakeOpeningPhoto => 'Retake opening photo';

  @override
  String get takeOpeningPhoto => 'Take opening photo';

  @override
  String get editOutletForm => 'Edit outlet form';

  @override
  String get fillOutletForm => 'Fill outlet form';

  @override
  String get checkOutComplete => 'Check out — complete activity';

  @override
  String get resubmitForReview => 'Resubmit for review';

  @override
  String get activityCompleted => 'Activity completed.';

  @override
  String get locationTrackingOn => 'Location tracking on';

  @override
  String get locationTrackingPaused => 'Location tracking paused';

  @override
  String get reportDeviationFromPlan => 'Report a deviation from plan';

  @override
  String get syncStatus => 'Sync status';

  @override
  String get syncNow => 'Sync now';

  @override
  String get notApplicableShort => 'N/A';

  @override
  String get done => 'Done';

  @override
  String get mandatory => 'Mandatory';

  @override
  String get optional => 'Optional';

  @override
  String get reportADeviation => 'Report a deviation';

  @override
  String get deviationExplainerText =>
      'This visit keeps going — this just records why, for your supervisor to review.';

  @override
  String get whatHappened => 'What happened?';

  @override
  String get reasonLabel => 'Reason *';

  @override
  String get remarksOptionalLabel => 'Remarks (optional)';

  @override
  String get pleaseExplainWhatHappened => 'Please explain what happened.';

  @override
  String get cancel => 'Cancel';

  @override
  String get sending => 'Sending…';

  @override
  String get submit => 'Submit';

  @override
  String get hideTechnicalDetails => 'Hide technical details';

  @override
  String get technicalDetails => 'Technical details';

  @override
  String get retake => 'Retake';

  @override
  String get outboxTypeCheckIn => 'Check-in';

  @override
  String get outboxTypeCheckOut => 'Check-out';

  @override
  String get outboxTypePhoto => 'Photo';

  @override
  String get outboxTypeFormSubmission => 'Form submission';

  @override
  String get noCameraFound => 'No camera found on this device';

  @override
  String cameraUnavailable(Object error) {
    return 'Camera unavailable: $error';
  }

  @override
  String couldNotCapturePhoto(Object error) {
    return 'Could not capture photo: $error';
  }

  @override
  String get locationRequiredRetry =>
      'Location is required before this photo can be used — try again';

  @override
  String get cameraTitle => 'Camera';

  @override
  String get reviewPhotoTitle => 'Review photo';

  @override
  String get locationUnavailable => 'Location unavailable';

  @override
  String cannotBeUsedRetake(Object reason) {
    return '$reason — this photo cannot be used yet. Retake after fixing this.';
  }

  @override
  String get savingPhoto => 'Saving…';

  @override
  String get useThisPhoto => 'Use this photo';

  @override
  String get openingPhotoTitle => 'Opening photo';

  @override
  String pleaseAnswerFields(Object fields) {
    return 'Please answer: $fields';
  }

  @override
  String minimumIs(Object label, Object min) {
    return '$label: minimum is $min';
  }

  @override
  String maximumIs(Object label, Object max) {
    return '$label: maximum is $max';
  }

  @override
  String get nameLabel => 'Name';

  @override
  String get mobileLabel => 'Mobile';

  @override
  String get addressLandmarkLabel => 'Address / landmark';

  @override
  String get selectADate => 'Select a date';

  @override
  String get selectATime => 'Select a time';

  @override
  String get selectDateTime => 'Select date & time';

  @override
  String get calculatedAutomatically =>
      'Calculated automatically — never typed in';

  @override
  String get computedAtReportTime => 'Computed at report time';

  @override
  String filledAutomaticallyOnServer(Object label) {
    return '$label — filled in automatically on the server.';
  }

  @override
  String capturedThroughEvidenceFlow(Object label) {
    return '$label — captured through the evidence flow (camera + GPS), not typed into this form.';
  }

  @override
  String captureArrivesLaterBuild(Object label) {
    return '$label — capture for this evidence type arrives in a later build stage.';
  }

  @override
  String unsupportedFieldType(Object label, Object type) {
    return '$label — unsupported field type ($type) in this build.';
  }

  @override
  String get loadingYourRoute => 'Loading your route…';

  @override
  String downloadingMap(Object done, Object total) {
    return 'Downloading map ($done/$total)…';
  }

  @override
  String get routeMapTitle => 'Route Map';

  @override
  String couldNotLoadRouteMap(Object error) {
    return 'Could not load your route map: $error';
  }

  @override
  String get noAssignedStopsToday =>
      'No assigned stops with a map location for today.';

  @override
  String get allStopsCompletedToday => 'All stops completed for today.';

  @override
  String distanceToNextStopUnknown(Object name) {
    return 'Distance to next stop ($name): turn on location to see this';
  }

  @override
  String distanceToNextStop(Object name, Object distance) {
    return 'Distance to next stop ($name): $distance';
  }

  @override
  String statusLine(Object status) {
    return 'Status: $status';
  }

  @override
  String distanceFromYou(Object distance) {
    return 'Distance from you: $distance';
  }

  @override
  String get turnOnLocationForDistance => 'Turn on location to see distance';

  @override
  String get openInGoogleMaps => 'Open in Google Maps';

  @override
  String get couldNotOpenGoogleMaps =>
      'Could not open Google Maps — check you have signal and a maps app installed.';

  @override
  String get qualityFlagBlurry => 'blurry';

  @override
  String get qualityFlagTooDark => 'too dark';

  @override
  String get qualityFlagTooBright => 'overexposed';

  @override
  String qualityWarningMessage(Object issues) {
    return 'This photo may be $issues — you can retake it or use it anyway.';
  }

  @override
  String get useAnyway => 'Use anyway';

  @override
  String get languageSettingTitle => 'Language / भाषा';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageHindi => 'हिन्दी';
}
