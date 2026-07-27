// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Hindi (`hi`).
class AppLocalizationsHi extends AppLocalizations {
  AppLocalizationsHi([String locale = 'hi']) : super(locale);

  @override
  String get appTitle => 'इम्पैक्ट फील्ड कमांड';

  @override
  String get fieldApplicationTagline => 'फील्ड एप्लिकेशन';

  @override
  String get mobileNumberLabel => 'मोबाइल नंबर';

  @override
  String get mobileNumberHint => '10 अंकों का मोबाइल नंबर';

  @override
  String get mobileNumberValidationError => 'सही 10 अंकों का मोबाइल नंबर डालें';

  @override
  String get sendingOtp => 'OTP भेजा जा रहा है…';

  @override
  String get sendOtp => 'OTP भेजें';

  @override
  String get verifyOtpTitle => 'OTP सत्यापित करें';

  @override
  String codeSentTo(Object mobile) {
    return '$mobile पर कोड भेजा गया';
  }

  @override
  String get mockNoSmsSent => 'मॉक — कोई SMS नहीं भेजा गया';

  @override
  String devOtpMessage(Object code) {
    return 'डेवलपमेंट मोड: आपका OTP $code है (यह केवल इसलिए दिख रहा है क्योंकि OTP_PROVIDER=mock है)।';
  }

  @override
  String get otpCodeLabel => 'OTP कोड';

  @override
  String get otpCodeValidationError => 'OTP कोड डालें';

  @override
  String get verifying => 'सत्यापित किया जा रहा है…';

  @override
  String get verifyAndSignIn => 'सत्यापित करें और साइन इन करें';

  @override
  String get deviceVerifiedLoading =>
      'डिवाइस सत्यापित हुआ। आपके कैंपेन लोड हो रहे हैं…';

  @override
  String get devicePendingDefaultMessage =>
      'इस्तेमाल से पहले इस डिवाइस को मंज़ूरी की ज़रूरत है।';

  @override
  String get devicePendingTitle => 'डिवाइस मंज़ूरी की प्रतीक्षा में';

  @override
  String get backToLogin => 'लॉगिन पर वापस जाएं';

  @override
  String get selectCampaignTitle => 'कैंपेन चुनें';

  @override
  String helloUser(Object name) {
    return 'नमस्ते, $name';
  }

  @override
  String accessToCampaigns(Object count) {
    return 'आपके पास $count कैंपेन तक पहुंच है।';
  }

  @override
  String get noActiveCampaignRole =>
      'अभी कोई सक्रिय कैंपेन भूमिका नहीं है। अपने प्रशासक से संपर्क करें।';

  @override
  String clientRoleLine(Object client, Object role) {
    return '$client · $role';
  }

  @override
  String couldNotStartDay(Object error) {
    return 'आपका दिन शुरू नहीं हो सका: $error';
  }

  @override
  String couldNotEndDay(Object error) {
    return 'आपका दिन समाप्त नहीं हो सका: $error';
  }

  @override
  String get switchCampaign => 'कैंपेन बदलें';

  @override
  String get defaultCampaignTitle => 'कैंपेन';

  @override
  String couldNotLoadBranding(Object error) {
    return 'कैंपेन ब्रांडिंग लोड नहीं हो सकी: $error';
  }

  @override
  String get signedInAs => 'इस रूप में साइन इन:';

  @override
  String get roleLabel => 'भूमिका';

  @override
  String get escalationContact => 'एस्केलेशन संपर्क';

  @override
  String get viewRouteMap => 'रूट मैप देखें';

  @override
  String get todaysAssignments => 'आज के असाइनमेंट';

  @override
  String couldNotLoadAssignments(Object error) {
    return 'असाइनमेंट लोड नहीं हो सके: $error';
  }

  @override
  String get noAssignmentsYet => 'इस कैंपेन के लिए अभी कोई असाइनमेंट नहीं है।';

  @override
  String get assignmentDefaultTitle => 'असाइनमेंट';

  @override
  String assignmentSubtitleWithLocation(
    Object district,
    Object state,
    Object status,
  ) {
    return '$district, $state — $status';
  }

  @override
  String get haventStartedDay => 'आपने अभी अपना दिन शुरू नहीं किया है';

  @override
  String dayStartedAt(Object time) {
    return 'दिन $time पर शुरू हुआ';
  }

  @override
  String dayStartedEnded(Object startTime, Object endTime) {
    return 'दिन $startTime पर शुरू हुआ · $endTime पर समाप्त हुआ';
  }

  @override
  String get working => 'काम जारी है…';

  @override
  String get startMyDay => 'मेरा दिन शुरू करें';

  @override
  String get endMyDay => 'मेरा दिन समाप्त करें';

  @override
  String get deviationOutsideRadius => 'स्वीकृत सीमा के बाहर';

  @override
  String get deviationUnplanned => 'अनियोजित स्थान';

  @override
  String get deviationSkipped => 'स्थान छोड़ा गया';

  @override
  String get deviationWrongSequence => 'गलत क्रम';

  @override
  String get deviationLateArrival => 'देर से पहुंचना';

  @override
  String get deviationEarlyDeparture => 'जल्दी निकलना';

  @override
  String get deviationUnplannedStoppage => 'अनियोजित ठहराव';

  @override
  String get deviationGpsDisabled => 'GPS बंद/अनुपलब्ध';

  @override
  String get deviationAbnormalSpeed => 'असामान्य गति';

  @override
  String get deviationSuspectedManipulation => 'स्थान में हेरफेर का संदेह';

  @override
  String get sentToSupervisor => 'आपके सुपरवाइज़र को समीक्षा के लिए भेजा गया।';

  @override
  String get couldNotRefresh =>
      'सर्वर से रीफ्रेश नहीं हो सका — इस डिवाइस पर सहेजी गई जानकारी दिखाई जा रही है।';

  @override
  String checkInFailed(Object error) {
    return 'चेक-इन विफल: $error';
  }

  @override
  String checkOutFailed(Object error) {
    return 'चेक-आउट विफल: $error';
  }

  @override
  String couldNotUpdateChecklist(Object error) {
    return 'चेकलिस्ट अपडेट नहीं हो सकी: $error';
  }

  @override
  String couldNotResubmit(Object error) {
    return 'फिर से जमा नहीं हो सका: $error';
  }

  @override
  String distanceFromPlanned(Object distance) {
    return 'आप नियोजित स्थान से लगभग $distanceमी दूर लग रहे हैं — कारण बताएं?';
  }

  @override
  String get awayFromPlanned =>
      'आप नियोजित स्थान से दूर लग रहे हैं — कारण बताएं?';

  @override
  String get unusualLocationJump =>
      'एक असामान्य स्थान परिवर्तन पाया गया — कारण बताएं?';

  @override
  String get unusualSpeed => 'एक असामान्य रूप से तेज़ गति पाई गई — कारण बताएं?';

  @override
  String get somethingUnusual => 'इस विज़िट में कुछ असामान्य लगा — कारण बताएं?';

  @override
  String get activityTitle => 'गतिविधि';

  @override
  String get fieldActivityDefault => 'फील्ड गतिविधि';

  @override
  String statusLabel(Object status) {
    return 'स्थिति: $status';
  }

  @override
  String get sentBackBySupervisor => 'आपके सुपरवाइज़र द्वारा वापस भेजा गया';

  @override
  String get noReasonGiven => 'कोई कारण नहीं दिया गया।';

  @override
  String get waitingForReview =>
      'आपके सुपरवाइज़र की इस विज़िट की समीक्षा की प्रतीक्षा है।';

  @override
  String get approvedBySupervisor => 'आपके सुपरवाइज़र द्वारा स्वीकृत।';

  @override
  String get explain => 'कारण बताएं';

  @override
  String get preActivityChecklist => 'गतिविधि-पूर्व चेकलिस्ट';

  @override
  String get gpsCheckIn => 'GPS चेक-इन';

  @override
  String get required => 'आवश्यक';

  @override
  String get notRequiredForMilestone => 'इस माइलस्टोन के लिए आवश्यक नहीं';

  @override
  String get photos => 'फ़ोटो';

  @override
  String photosCountCaptured(Object count, Object requiredCount) {
    return '$requiredCount में से $count लिए गए';
  }

  @override
  String get outletVisitForm => 'आउटलेट विज़िट फॉर्म';

  @override
  String get submitted => 'जमा किया गया';

  @override
  String get notSubmittedYet => 'अभी जमा नहीं किया गया';

  @override
  String get checkIn => 'चेक इन करें';

  @override
  String get retakeOpeningPhoto => 'ओपनिंग फ़ोटो फिर से लें';

  @override
  String get takeOpeningPhoto => 'ओपनिंग फ़ोटो लें';

  @override
  String get editOutletForm => 'आउटलेट फॉर्म संपादित करें';

  @override
  String get fillOutletForm => 'आउटलेट फॉर्म भरें';

  @override
  String get checkOutComplete => 'चेक आउट करें — गतिविधि पूरी करें';

  @override
  String get resubmitForReview => 'समीक्षा के लिए फिर से जमा करें';

  @override
  String get activityCompleted => 'गतिविधि पूरी हुई।';

  @override
  String get locationTrackingOn => 'लोकेशन ट्रैकिंग चालू है';

  @override
  String get locationTrackingPaused => 'लोकेशन ट्रैकिंग रुकी हुई है';

  @override
  String get reportDeviationFromPlan => 'योजना से विचलन की रिपोर्ट करें';

  @override
  String get syncStatus => 'सिंक स्थिति';

  @override
  String get syncNow => 'अभी सिंक करें';

  @override
  String get notApplicableShort => 'लागू नहीं';

  @override
  String get done => 'पूर्ण';

  @override
  String get mandatory => 'अनिवार्य';

  @override
  String get optional => 'वैकल्पिक';

  @override
  String get reportADeviation => 'विचलन की रिपोर्ट करें';

  @override
  String get deviationExplainerText =>
      'यह विज़िट जारी रहेगी — यह सिर्फ यह दर्ज करता है कि क्यों, आपके सुपरवाइज़र की समीक्षा के लिए।';

  @override
  String get whatHappened => 'क्या हुआ?';

  @override
  String get reasonLabel => 'कारण *';

  @override
  String get remarksOptionalLabel => 'टिप्पणी (वैकल्पिक)';

  @override
  String get pleaseExplainWhatHappened => 'कृपया बताएं कि क्या हुआ।';

  @override
  String get cancel => 'रद्द करें';

  @override
  String get sending => 'भेजा जा रहा है…';

  @override
  String get submit => 'जमा करें';

  @override
  String get hideTechnicalDetails => 'तकनीकी विवरण छिपाएं';

  @override
  String get technicalDetails => 'तकनीकी विवरण';

  @override
  String get retake => 'फिर से लें';

  @override
  String get outboxTypeCheckIn => 'चेक-इन';

  @override
  String get outboxTypeCheckOut => 'चेक-आउट';

  @override
  String get outboxTypePhoto => 'फ़ोटो';

  @override
  String get outboxTypeFormSubmission => 'फॉर्म जमा करना';

  @override
  String get noCameraFound => 'इस डिवाइस पर कोई कैमरा नहीं मिला';

  @override
  String cameraUnavailable(Object error) {
    return 'कैमरा उपलब्ध नहीं है: $error';
  }

  @override
  String couldNotCapturePhoto(Object error) {
    return 'फ़ोटो नहीं ली जा सकी: $error';
  }

  @override
  String get locationRequiredRetry =>
      'इस फ़ोटो के इस्तेमाल के लिए लोकेशन ज़रूरी है — फिर से कोशिश करें';

  @override
  String get cameraTitle => 'कैमरा';

  @override
  String get reviewPhotoTitle => 'फ़ोटो की समीक्षा करें';

  @override
  String get locationUnavailable => 'लोकेशन उपलब्ध नहीं है';

  @override
  String cannotBeUsedRetake(Object reason) {
    return '$reason — यह फ़ोटो अभी इस्तेमाल नहीं की जा सकती। ठीक करने के बाद फिर से लें।';
  }

  @override
  String get savingPhoto => 'सहेजा जा रहा है…';

  @override
  String get useThisPhoto => 'यह फ़ोटो इस्तेमाल करें';

  @override
  String get openingPhotoTitle => 'ओपनिंग फ़ोटो';

  @override
  String pleaseAnswerFields(Object fields) {
    return 'कृपया उत्तर दें: $fields';
  }

  @override
  String minimumIs(Object label, Object min) {
    return '$label: न्यूनतम $min है';
  }

  @override
  String maximumIs(Object label, Object max) {
    return '$label: अधिकतम $max है';
  }

  @override
  String get nameLabel => 'नाम';

  @override
  String get mobileLabel => 'मोबाइल';

  @override
  String get addressLandmarkLabel => 'पता / लैंडमार्क';

  @override
  String get selectADate => 'एक तारीख चुनें';

  @override
  String get selectATime => 'एक समय चुनें';

  @override
  String get selectDateTime => 'तारीख और समय चुनें';

  @override
  String get calculatedAutomatically =>
      'स्वचालित रूप से गणना की जाती है — कभी टाइप नहीं किया जाता';

  @override
  String get computedAtReportTime => 'रिपोर्ट के समय गणना की जाएगी';

  @override
  String filledAutomaticallyOnServer(Object label) {
    return '$label — सर्वर पर स्वचालित रूप से भरा जाता है।';
  }

  @override
  String capturedThroughEvidenceFlow(Object label) {
    return '$label — एविडेंस फ्लो (कैमरा + GPS) के ज़रिए लिया जाता है, इस फॉर्म में टाइप नहीं किया जाता।';
  }

  @override
  String captureArrivesLaterBuild(Object label) {
    return '$label — इस एविडेंस प्रकार के लिए कैप्चर एक बाद के बिल्ड चरण में आएगा।';
  }

  @override
  String unsupportedFieldType(Object label, Object type) {
    return '$label — इस बिल्ड में असमर्थित फ़ील्ड प्रकार ($type)।';
  }

  @override
  String get loadingYourRoute => 'आपका रूट लोड हो रहा है…';

  @override
  String downloadingMap(Object done, Object total) {
    return 'मैप डाउनलोड हो रहा है ($done/$total)…';
  }

  @override
  String get routeMapTitle => 'रूट मैप';

  @override
  String couldNotLoadRouteMap(Object error) {
    return 'आपका रूट मैप लोड नहीं हो सका: $error';
  }

  @override
  String get noAssignedStopsToday =>
      'आज के लिए मैप लोकेशन वाला कोई असाइन किया गया स्टॉप नहीं है।';

  @override
  String get allStopsCompletedToday => 'आज के सभी स्टॉप पूरे हो गए।';

  @override
  String distanceToNextStopUnknown(Object name) {
    return 'अगले स्टॉप की दूरी ($name): यह देखने के लिए लोकेशन चालू करें';
  }

  @override
  String distanceToNextStop(Object name, Object distance) {
    return 'अगले स्टॉप की दूरी ($name): $distance';
  }

  @override
  String statusLine(Object status) {
    return 'स्थिति: $status';
  }

  @override
  String distanceFromYou(Object distance) {
    return 'आपसे दूरी: $distance';
  }

  @override
  String get turnOnLocationForDistance => 'दूरी देखने के लिए लोकेशन चालू करें';

  @override
  String get openInGoogleMaps => 'गूगल मैप्स में खोलें';

  @override
  String get couldNotOpenGoogleMaps =>
      'गूगल मैप्स नहीं खुल सका — जांचें कि आपके पास सिग्नल और एक मैप्स ऐप है।';

  @override
  String get languageSettingTitle => 'Language / भाषा';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageHindi => 'हिन्दी';
}
