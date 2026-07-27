import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_hi.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('hi'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'Impact Field Command'**
  String get appTitle;

  /// No description provided for @fieldApplicationTagline.
  ///
  /// In en, this message translates to:
  /// **'Field application'**
  String get fieldApplicationTagline;

  /// No description provided for @mobileNumberLabel.
  ///
  /// In en, this message translates to:
  /// **'Mobile number'**
  String get mobileNumberLabel;

  /// No description provided for @mobileNumberHint.
  ///
  /// In en, this message translates to:
  /// **'10-digit mobile number'**
  String get mobileNumberHint;

  /// No description provided for @mobileNumberValidationError.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid 10-digit mobile number'**
  String get mobileNumberValidationError;

  /// No description provided for @sendingOtp.
  ///
  /// In en, this message translates to:
  /// **'Sending OTP…'**
  String get sendingOtp;

  /// No description provided for @sendOtp.
  ///
  /// In en, this message translates to:
  /// **'Send OTP'**
  String get sendOtp;

  /// No description provided for @verifyOtpTitle.
  ///
  /// In en, this message translates to:
  /// **'Verify OTP'**
  String get verifyOtpTitle;

  /// No description provided for @codeSentTo.
  ///
  /// In en, this message translates to:
  /// **'Code sent to {mobile}'**
  String codeSentTo(Object mobile);

  /// No description provided for @mockNoSmsSent.
  ///
  /// In en, this message translates to:
  /// **'MOCK — NO SMS SENT'**
  String get mockNoSmsSent;

  /// No description provided for @devOtpMessage.
  ///
  /// In en, this message translates to:
  /// **'Development mode: your OTP is {code} (shown here only because OTP_PROVIDER=mock).'**
  String devOtpMessage(Object code);

  /// No description provided for @otpCodeLabel.
  ///
  /// In en, this message translates to:
  /// **'OTP code'**
  String get otpCodeLabel;

  /// No description provided for @otpCodeValidationError.
  ///
  /// In en, this message translates to:
  /// **'Enter the OTP code'**
  String get otpCodeValidationError;

  /// No description provided for @verifying.
  ///
  /// In en, this message translates to:
  /// **'Verifying…'**
  String get verifying;

  /// No description provided for @verifyAndSignIn.
  ///
  /// In en, this message translates to:
  /// **'Verify & sign in'**
  String get verifyAndSignIn;

  /// No description provided for @deviceVerifiedLoading.
  ///
  /// In en, this message translates to:
  /// **'Device verified. Loading your campaigns…'**
  String get deviceVerifiedLoading;

  /// No description provided for @devicePendingDefaultMessage.
  ///
  /// In en, this message translates to:
  /// **'This device needs approval before it can be used.'**
  String get devicePendingDefaultMessage;

  /// No description provided for @devicePendingTitle.
  ///
  /// In en, this message translates to:
  /// **'Device pending approval'**
  String get devicePendingTitle;

  /// No description provided for @backToLogin.
  ///
  /// In en, this message translates to:
  /// **'Back to login'**
  String get backToLogin;

  /// No description provided for @selectCampaignTitle.
  ///
  /// In en, this message translates to:
  /// **'Select campaign'**
  String get selectCampaignTitle;

  /// No description provided for @helloUser.
  ///
  /// In en, this message translates to:
  /// **'Hello, {name}'**
  String helloUser(Object name);

  /// No description provided for @accessToCampaigns.
  ///
  /// In en, this message translates to:
  /// **'You have access to {count} campaign(s).'**
  String accessToCampaigns(Object count);

  /// No description provided for @noActiveCampaignRole.
  ///
  /// In en, this message translates to:
  /// **'No active campaign role yet. Contact your administrator.'**
  String get noActiveCampaignRole;

  /// No description provided for @clientRoleLine.
  ///
  /// In en, this message translates to:
  /// **'{client} · {role}'**
  String clientRoleLine(Object client, Object role);

  /// No description provided for @couldNotStartDay.
  ///
  /// In en, this message translates to:
  /// **'Could not start your day: {error}'**
  String couldNotStartDay(Object error);

  /// No description provided for @couldNotEndDay.
  ///
  /// In en, this message translates to:
  /// **'Could not end your day: {error}'**
  String couldNotEndDay(Object error);

  /// No description provided for @switchCampaign.
  ///
  /// In en, this message translates to:
  /// **'Switch campaign'**
  String get switchCampaign;

  /// No description provided for @defaultCampaignTitle.
  ///
  /// In en, this message translates to:
  /// **'Campaign'**
  String get defaultCampaignTitle;

  /// No description provided for @couldNotLoadBranding.
  ///
  /// In en, this message translates to:
  /// **'Could not load campaign branding: {error}'**
  String couldNotLoadBranding(Object error);

  /// No description provided for @signedInAs.
  ///
  /// In en, this message translates to:
  /// **'Signed in as'**
  String get signedInAs;

  /// No description provided for @roleLabel.
  ///
  /// In en, this message translates to:
  /// **'Role'**
  String get roleLabel;

  /// No description provided for @escalationContact.
  ///
  /// In en, this message translates to:
  /// **'Escalation contact'**
  String get escalationContact;

  /// No description provided for @viewRouteMap.
  ///
  /// In en, this message translates to:
  /// **'View Route Map'**
  String get viewRouteMap;

  /// No description provided for @todaysAssignments.
  ///
  /// In en, this message translates to:
  /// **'Today\'s assignments'**
  String get todaysAssignments;

  /// No description provided for @couldNotLoadAssignments.
  ///
  /// In en, this message translates to:
  /// **'Could not load assignments: {error}'**
  String couldNotLoadAssignments(Object error);

  /// No description provided for @noAssignmentsYet.
  ///
  /// In en, this message translates to:
  /// **'No assignments for this campaign yet.'**
  String get noAssignmentsYet;

  /// No description provided for @assignmentDefaultTitle.
  ///
  /// In en, this message translates to:
  /// **'Assignment'**
  String get assignmentDefaultTitle;

  /// No description provided for @assignmentSubtitleWithLocation.
  ///
  /// In en, this message translates to:
  /// **'{district}, {state} — {status}'**
  String assignmentSubtitleWithLocation(
    Object district,
    Object state,
    Object status,
  );

  /// No description provided for @haventStartedDay.
  ///
  /// In en, this message translates to:
  /// **'You haven\'t started your day yet'**
  String get haventStartedDay;

  /// No description provided for @dayStartedAt.
  ///
  /// In en, this message translates to:
  /// **'Day started at {time}'**
  String dayStartedAt(Object time);

  /// No description provided for @dayStartedEnded.
  ///
  /// In en, this message translates to:
  /// **'Day started {startTime} · ended {endTime}'**
  String dayStartedEnded(Object startTime, Object endTime);

  /// No description provided for @working.
  ///
  /// In en, this message translates to:
  /// **'Working…'**
  String get working;

  /// No description provided for @startMyDay.
  ///
  /// In en, this message translates to:
  /// **'Start my day'**
  String get startMyDay;

  /// No description provided for @endMyDay.
  ///
  /// In en, this message translates to:
  /// **'End my day'**
  String get endMyDay;

  /// No description provided for @deviationOutsideRadius.
  ///
  /// In en, this message translates to:
  /// **'Outside permitted radius'**
  String get deviationOutsideRadius;

  /// No description provided for @deviationUnplanned.
  ///
  /// In en, this message translates to:
  /// **'Unplanned location'**
  String get deviationUnplanned;

  /// No description provided for @deviationSkipped.
  ///
  /// In en, this message translates to:
  /// **'Skipped location'**
  String get deviationSkipped;

  /// No description provided for @deviationWrongSequence.
  ///
  /// In en, this message translates to:
  /// **'Wrong sequence'**
  String get deviationWrongSequence;

  /// No description provided for @deviationLateArrival.
  ///
  /// In en, this message translates to:
  /// **'Late arrival'**
  String get deviationLateArrival;

  /// No description provided for @deviationEarlyDeparture.
  ///
  /// In en, this message translates to:
  /// **'Early departure'**
  String get deviationEarlyDeparture;

  /// No description provided for @deviationUnplannedStoppage.
  ///
  /// In en, this message translates to:
  /// **'Unplanned stoppage'**
  String get deviationUnplannedStoppage;

  /// No description provided for @deviationGpsDisabled.
  ///
  /// In en, this message translates to:
  /// **'GPS disabled/unavailable'**
  String get deviationGpsDisabled;

  /// No description provided for @deviationAbnormalSpeed.
  ///
  /// In en, this message translates to:
  /// **'Abnormal speed'**
  String get deviationAbnormalSpeed;

  /// No description provided for @deviationSuspectedManipulation.
  ///
  /// In en, this message translates to:
  /// **'Suspected location manipulation'**
  String get deviationSuspectedManipulation;

  /// No description provided for @sentToSupervisor.
  ///
  /// In en, this message translates to:
  /// **'Sent to your supervisor for review.'**
  String get sentToSupervisor;

  /// No description provided for @couldNotRefresh.
  ///
  /// In en, this message translates to:
  /// **'Could not refresh from the server — showing what\'s saved on this device.'**
  String get couldNotRefresh;

  /// No description provided for @checkInFailed.
  ///
  /// In en, this message translates to:
  /// **'Check-in failed: {error}'**
  String checkInFailed(Object error);

  /// No description provided for @checkOutFailed.
  ///
  /// In en, this message translates to:
  /// **'Check-out failed: {error}'**
  String checkOutFailed(Object error);

  /// No description provided for @couldNotUpdateChecklist.
  ///
  /// In en, this message translates to:
  /// **'Could not update checklist: {error}'**
  String couldNotUpdateChecklist(Object error);

  /// No description provided for @couldNotResubmit.
  ///
  /// In en, this message translates to:
  /// **'Could not resubmit: {error}'**
  String couldNotResubmit(Object error);

  /// No description provided for @distanceFromPlanned.
  ///
  /// In en, this message translates to:
  /// **'You appear to be about {distance}m from the planned location — explain why?'**
  String distanceFromPlanned(Object distance);

  /// No description provided for @awayFromPlanned.
  ///
  /// In en, this message translates to:
  /// **'You appear to be away from the planned location — explain why?'**
  String get awayFromPlanned;

  /// No description provided for @unusualLocationJump.
  ///
  /// In en, this message translates to:
  /// **'An unusual location jump was detected — explain why?'**
  String get unusualLocationJump;

  /// No description provided for @unusualSpeed.
  ///
  /// In en, this message translates to:
  /// **'An unusually high speed was detected — explain why?'**
  String get unusualSpeed;

  /// No description provided for @somethingUnusual.
  ///
  /// In en, this message translates to:
  /// **'Something about this visit looked unusual — explain why?'**
  String get somethingUnusual;

  /// No description provided for @activityTitle.
  ///
  /// In en, this message translates to:
  /// **'Activity'**
  String get activityTitle;

  /// No description provided for @fieldActivityDefault.
  ///
  /// In en, this message translates to:
  /// **'Field activity'**
  String get fieldActivityDefault;

  /// No description provided for @statusLabel.
  ///
  /// In en, this message translates to:
  /// **'Status: {status}'**
  String statusLabel(Object status);

  /// No description provided for @sentBackBySupervisor.
  ///
  /// In en, this message translates to:
  /// **'Sent back by your supervisor'**
  String get sentBackBySupervisor;

  /// No description provided for @noReasonGiven.
  ///
  /// In en, this message translates to:
  /// **'No reason given.'**
  String get noReasonGiven;

  /// No description provided for @waitingForReview.
  ///
  /// In en, this message translates to:
  /// **'Waiting for your supervisor to review this visit.'**
  String get waitingForReview;

  /// No description provided for @approvedBySupervisor.
  ///
  /// In en, this message translates to:
  /// **'Approved by your supervisor.'**
  String get approvedBySupervisor;

  /// No description provided for @explain.
  ///
  /// In en, this message translates to:
  /// **'Explain'**
  String get explain;

  /// No description provided for @preActivityChecklist.
  ///
  /// In en, this message translates to:
  /// **'Pre-activity checklist'**
  String get preActivityChecklist;

  /// No description provided for @gpsCheckIn.
  ///
  /// In en, this message translates to:
  /// **'GPS check-in'**
  String get gpsCheckIn;

  /// No description provided for @required.
  ///
  /// In en, this message translates to:
  /// **'Required'**
  String get required;

  /// No description provided for @notRequiredForMilestone.
  ///
  /// In en, this message translates to:
  /// **'Not required for this milestone'**
  String get notRequiredForMilestone;

  /// No description provided for @photos.
  ///
  /// In en, this message translates to:
  /// **'Photos'**
  String get photos;

  /// No description provided for @photosCountCaptured.
  ///
  /// In en, this message translates to:
  /// **'{count} of {requiredCount} captured'**
  String photosCountCaptured(Object count, Object requiredCount);

  /// No description provided for @outletVisitForm.
  ///
  /// In en, this message translates to:
  /// **'Outlet Visit form'**
  String get outletVisitForm;

  /// No description provided for @submitted.
  ///
  /// In en, this message translates to:
  /// **'Submitted'**
  String get submitted;

  /// No description provided for @notSubmittedYet.
  ///
  /// In en, this message translates to:
  /// **'Not submitted yet'**
  String get notSubmittedYet;

  /// No description provided for @checkIn.
  ///
  /// In en, this message translates to:
  /// **'Check in'**
  String get checkIn;

  /// No description provided for @retakeOpeningPhoto.
  ///
  /// In en, this message translates to:
  /// **'Retake opening photo'**
  String get retakeOpeningPhoto;

  /// No description provided for @takeOpeningPhoto.
  ///
  /// In en, this message translates to:
  /// **'Take opening photo'**
  String get takeOpeningPhoto;

  /// No description provided for @editOutletForm.
  ///
  /// In en, this message translates to:
  /// **'Edit outlet form'**
  String get editOutletForm;

  /// No description provided for @fillOutletForm.
  ///
  /// In en, this message translates to:
  /// **'Fill outlet form'**
  String get fillOutletForm;

  /// No description provided for @checkOutComplete.
  ///
  /// In en, this message translates to:
  /// **'Check out — complete activity'**
  String get checkOutComplete;

  /// No description provided for @resubmitForReview.
  ///
  /// In en, this message translates to:
  /// **'Resubmit for review'**
  String get resubmitForReview;

  /// No description provided for @activityCompleted.
  ///
  /// In en, this message translates to:
  /// **'Activity completed.'**
  String get activityCompleted;

  /// No description provided for @locationTrackingOn.
  ///
  /// In en, this message translates to:
  /// **'Location tracking on'**
  String get locationTrackingOn;

  /// No description provided for @locationTrackingPaused.
  ///
  /// In en, this message translates to:
  /// **'Location tracking paused'**
  String get locationTrackingPaused;

  /// No description provided for @reportDeviationFromPlan.
  ///
  /// In en, this message translates to:
  /// **'Report a deviation from plan'**
  String get reportDeviationFromPlan;

  /// No description provided for @syncStatus.
  ///
  /// In en, this message translates to:
  /// **'Sync status'**
  String get syncStatus;

  /// No description provided for @syncNow.
  ///
  /// In en, this message translates to:
  /// **'Sync now'**
  String get syncNow;

  /// No description provided for @notApplicableShort.
  ///
  /// In en, this message translates to:
  /// **'N/A'**
  String get notApplicableShort;

  /// No description provided for @done.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get done;

  /// No description provided for @mandatory.
  ///
  /// In en, this message translates to:
  /// **'Mandatory'**
  String get mandatory;

  /// No description provided for @optional.
  ///
  /// In en, this message translates to:
  /// **'Optional'**
  String get optional;

  /// No description provided for @reportADeviation.
  ///
  /// In en, this message translates to:
  /// **'Report a deviation'**
  String get reportADeviation;

  /// No description provided for @deviationExplainerText.
  ///
  /// In en, this message translates to:
  /// **'This visit keeps going — this just records why, for your supervisor to review.'**
  String get deviationExplainerText;

  /// No description provided for @whatHappened.
  ///
  /// In en, this message translates to:
  /// **'What happened?'**
  String get whatHappened;

  /// No description provided for @reasonLabel.
  ///
  /// In en, this message translates to:
  /// **'Reason *'**
  String get reasonLabel;

  /// No description provided for @remarksOptionalLabel.
  ///
  /// In en, this message translates to:
  /// **'Remarks (optional)'**
  String get remarksOptionalLabel;

  /// No description provided for @pleaseExplainWhatHappened.
  ///
  /// In en, this message translates to:
  /// **'Please explain what happened.'**
  String get pleaseExplainWhatHappened;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @sending.
  ///
  /// In en, this message translates to:
  /// **'Sending…'**
  String get sending;

  /// No description provided for @submit.
  ///
  /// In en, this message translates to:
  /// **'Submit'**
  String get submit;

  /// No description provided for @hideTechnicalDetails.
  ///
  /// In en, this message translates to:
  /// **'Hide technical details'**
  String get hideTechnicalDetails;

  /// No description provided for @technicalDetails.
  ///
  /// In en, this message translates to:
  /// **'Technical details'**
  String get technicalDetails;

  /// No description provided for @retake.
  ///
  /// In en, this message translates to:
  /// **'Retake'**
  String get retake;

  /// No description provided for @outboxTypeCheckIn.
  ///
  /// In en, this message translates to:
  /// **'Check-in'**
  String get outboxTypeCheckIn;

  /// No description provided for @outboxTypeCheckOut.
  ///
  /// In en, this message translates to:
  /// **'Check-out'**
  String get outboxTypeCheckOut;

  /// No description provided for @outboxTypePhoto.
  ///
  /// In en, this message translates to:
  /// **'Photo'**
  String get outboxTypePhoto;

  /// No description provided for @outboxTypeFormSubmission.
  ///
  /// In en, this message translates to:
  /// **'Form submission'**
  String get outboxTypeFormSubmission;

  /// No description provided for @noCameraFound.
  ///
  /// In en, this message translates to:
  /// **'No camera found on this device'**
  String get noCameraFound;

  /// No description provided for @cameraUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Camera unavailable: {error}'**
  String cameraUnavailable(Object error);

  /// No description provided for @couldNotCapturePhoto.
  ///
  /// In en, this message translates to:
  /// **'Could not capture photo: {error}'**
  String couldNotCapturePhoto(Object error);

  /// No description provided for @locationRequiredRetry.
  ///
  /// In en, this message translates to:
  /// **'Location is required before this photo can be used — try again'**
  String get locationRequiredRetry;

  /// No description provided for @cameraTitle.
  ///
  /// In en, this message translates to:
  /// **'Camera'**
  String get cameraTitle;

  /// No description provided for @reviewPhotoTitle.
  ///
  /// In en, this message translates to:
  /// **'Review photo'**
  String get reviewPhotoTitle;

  /// No description provided for @locationUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Location unavailable'**
  String get locationUnavailable;

  /// No description provided for @cannotBeUsedRetake.
  ///
  /// In en, this message translates to:
  /// **'{reason} — this photo cannot be used yet. Retake after fixing this.'**
  String cannotBeUsedRetake(Object reason);

  /// No description provided for @savingPhoto.
  ///
  /// In en, this message translates to:
  /// **'Saving…'**
  String get savingPhoto;

  /// No description provided for @useThisPhoto.
  ///
  /// In en, this message translates to:
  /// **'Use this photo'**
  String get useThisPhoto;

  /// No description provided for @openingPhotoTitle.
  ///
  /// In en, this message translates to:
  /// **'Opening photo'**
  String get openingPhotoTitle;

  /// No description provided for @pleaseAnswerFields.
  ///
  /// In en, this message translates to:
  /// **'Please answer: {fields}'**
  String pleaseAnswerFields(Object fields);

  /// No description provided for @minimumIs.
  ///
  /// In en, this message translates to:
  /// **'{label}: minimum is {min}'**
  String minimumIs(Object label, Object min);

  /// No description provided for @maximumIs.
  ///
  /// In en, this message translates to:
  /// **'{label}: maximum is {max}'**
  String maximumIs(Object label, Object max);

  /// No description provided for @nameLabel.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get nameLabel;

  /// No description provided for @mobileLabel.
  ///
  /// In en, this message translates to:
  /// **'Mobile'**
  String get mobileLabel;

  /// No description provided for @addressLandmarkLabel.
  ///
  /// In en, this message translates to:
  /// **'Address / landmark'**
  String get addressLandmarkLabel;

  /// No description provided for @selectADate.
  ///
  /// In en, this message translates to:
  /// **'Select a date'**
  String get selectADate;

  /// No description provided for @selectATime.
  ///
  /// In en, this message translates to:
  /// **'Select a time'**
  String get selectATime;

  /// No description provided for @selectDateTime.
  ///
  /// In en, this message translates to:
  /// **'Select date & time'**
  String get selectDateTime;

  /// No description provided for @calculatedAutomatically.
  ///
  /// In en, this message translates to:
  /// **'Calculated automatically — never typed in'**
  String get calculatedAutomatically;

  /// No description provided for @computedAtReportTime.
  ///
  /// In en, this message translates to:
  /// **'Computed at report time'**
  String get computedAtReportTime;

  /// No description provided for @filledAutomaticallyOnServer.
  ///
  /// In en, this message translates to:
  /// **'{label} — filled in automatically on the server.'**
  String filledAutomaticallyOnServer(Object label);

  /// No description provided for @capturedThroughEvidenceFlow.
  ///
  /// In en, this message translates to:
  /// **'{label} — captured through the evidence flow (camera + GPS), not typed into this form.'**
  String capturedThroughEvidenceFlow(Object label);

  /// No description provided for @captureArrivesLaterBuild.
  ///
  /// In en, this message translates to:
  /// **'{label} — capture for this evidence type arrives in a later build stage.'**
  String captureArrivesLaterBuild(Object label);

  /// No description provided for @unsupportedFieldType.
  ///
  /// In en, this message translates to:
  /// **'{label} — unsupported field type ({type}) in this build.'**
  String unsupportedFieldType(Object label, Object type);

  /// No description provided for @loadingYourRoute.
  ///
  /// In en, this message translates to:
  /// **'Loading your route…'**
  String get loadingYourRoute;

  /// No description provided for @downloadingMap.
  ///
  /// In en, this message translates to:
  /// **'Downloading map ({done}/{total})…'**
  String downloadingMap(Object done, Object total);

  /// No description provided for @routeMapTitle.
  ///
  /// In en, this message translates to:
  /// **'Route Map'**
  String get routeMapTitle;

  /// No description provided for @couldNotLoadRouteMap.
  ///
  /// In en, this message translates to:
  /// **'Could not load your route map: {error}'**
  String couldNotLoadRouteMap(Object error);

  /// No description provided for @noAssignedStopsToday.
  ///
  /// In en, this message translates to:
  /// **'No assigned stops with a map location for today.'**
  String get noAssignedStopsToday;

  /// No description provided for @allStopsCompletedToday.
  ///
  /// In en, this message translates to:
  /// **'All stops completed for today.'**
  String get allStopsCompletedToday;

  /// No description provided for @distanceToNextStopUnknown.
  ///
  /// In en, this message translates to:
  /// **'Distance to next stop ({name}): turn on location to see this'**
  String distanceToNextStopUnknown(Object name);

  /// No description provided for @distanceToNextStop.
  ///
  /// In en, this message translates to:
  /// **'Distance to next stop ({name}): {distance}'**
  String distanceToNextStop(Object name, Object distance);

  /// No description provided for @statusLine.
  ///
  /// In en, this message translates to:
  /// **'Status: {status}'**
  String statusLine(Object status);

  /// No description provided for @distanceFromYou.
  ///
  /// In en, this message translates to:
  /// **'Distance from you: {distance}'**
  String distanceFromYou(Object distance);

  /// No description provided for @turnOnLocationForDistance.
  ///
  /// In en, this message translates to:
  /// **'Turn on location to see distance'**
  String get turnOnLocationForDistance;

  /// No description provided for @openInGoogleMaps.
  ///
  /// In en, this message translates to:
  /// **'Open in Google Maps'**
  String get openInGoogleMaps;

  /// No description provided for @couldNotOpenGoogleMaps.
  ///
  /// In en, this message translates to:
  /// **'Could not open Google Maps — check you have signal and a maps app installed.'**
  String get couldNotOpenGoogleMaps;

  /// No description provided for @qualityFlagBlurry.
  ///
  /// In en, this message translates to:
  /// **'blurry'**
  String get qualityFlagBlurry;

  /// No description provided for @qualityFlagTooDark.
  ///
  /// In en, this message translates to:
  /// **'too dark'**
  String get qualityFlagTooDark;

  /// No description provided for @qualityFlagTooBright.
  ///
  /// In en, this message translates to:
  /// **'overexposed'**
  String get qualityFlagTooBright;

  /// No description provided for @qualityWarningMessage.
  ///
  /// In en, this message translates to:
  /// **'This photo may be {issues} — you can retake it or use it anyway.'**
  String qualityWarningMessage(Object issues);

  /// No description provided for @useAnyway.
  ///
  /// In en, this message translates to:
  /// **'Use anyway'**
  String get useAnyway;

  /// No description provided for @languageSettingTitle.
  ///
  /// In en, this message translates to:
  /// **'Language / भाषा'**
  String get languageSettingTitle;

  /// No description provided for @languageEnglish.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get languageEnglish;

  /// No description provided for @languageHindi.
  ///
  /// In en, this message translates to:
  /// **'हिन्दी'**
  String get languageHindi;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'hi'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'hi':
      return AppLocalizationsHi();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
