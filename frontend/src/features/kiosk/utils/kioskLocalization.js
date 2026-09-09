/**
 * Kiosk Localization Dictionary
 * 
 * Multi-lingual strings for English (en), Hindi (hi), and Gujarati (gu).
 */

export const kioskStrings = {
  en: {
    // KioskHome strings
    welcome: 'Welcome to MultiSpecialist Hospital',
    subtitle: 'Your health journey starts here.',
    description: 'We will guide you through a few simple questions before your consultation.',
    hear: 'Hear Instructions',
    stop: 'Stop Instructions',
    start: 'Start Consultation',
    tap: 'Tap the button to begin',
    protected: 'Your information is protected',
    secure: 'Secure consultation',
    patientAssistance: 'PATIENT ASSISTANCE',
    language: 'Language',
    selectLanguage: 'Select Your Language',
    speechText: 'Welcome to MultiSpecialist Hospital. We will guide you through a few simple questions before your consultation. Press Start Consultation when you are ready.',
    copyright: '© 2026 MultiSpecialist Hospital',

    // Phase titles & subtitles
    phases: {
      chief_complaint: {
        title: 'Chief Complaint',
        subtitle: 'Describe your primary health concern'
      },
      hpi: {
        title: 'History of Present Illness (HPI)',
        subtitle: 'Understanding your symptom patterns, onset, and duration'
      },
      extended_history: {
        title: 'Medical History & Background',
        subtitle: 'Prior conditions, routine medications, and allergies'
      },
      ros: {
        title: 'Review of Systems',
        subtitle: 'Checking general body systems and associated symptoms'
      },
      ayush: {
        title: 'AYUSH Constitutional Evaluation',
        subtitle: 'Holistic lifestyle and physiological assessment'
      }
    },

    // Initial complaint screen
    tellUsHealthProblem: 'Tell us about your health problem',
    describeInOwnWords: 'Please describe what you are experiencing in your own words.',
    optionVoice: 'Option A: 🎤 Voice',
    optionText: 'Option B: ⌨️ Text',
    orTypeBelow: 'Or type your symptoms below',
    typePlaceholder: "Type what you are experiencing in your own words (e.g., I have fever, headache, and sore throat for 2 days)...",
    continueConsultation: 'Continue Consultation',
    submittingComplaint: 'Submitting your health concern...',

    // Navigation & Common
    consultationTitle: 'Patient Consultation',
    intakeDesk: 'Consultation Intake Desk',
    exitConsultation: 'Exit Consultation',
    session: 'Session',
    recordingAnswer: 'Recording your answer...',
    connectionNotice: 'Connection Notice',
    retry: 'Retry',
    preparingConsultation: 'Preparing Your Consultation',
    connectingEngine: 'Connecting securely to the MultiSpecialist clinical evaluation engine...',
    loadingQuestion: 'Loading next question...',
    orAnswerTouch: 'Or answer with touch below',

    // Voice Recorder
    voiceAnswerOption: 'Voice Answer Option',
    speakingHint: 'Speaking... tap stop when done',
    sendingToEngine: 'Sending to clinical engine',
    touchOrVoice: 'Touch or Voice',
    tapToSpeak: 'Tap to Speak',
    tapToSpeakSub: 'Speak your answer in your preferred language',
    allowMic: 'Allow microphone...',
    allowMicSub: 'Confirm the browser permission prompt',
    listening: 'Listening...',
    listeningSub: 'Tap to complete response',
    processing: 'Processing...',
    processingSub: 'Transcribing clinical response',
    processingBanner: 'Transcribing audio via speech recognition engine...',
    tryAgain: 'Try Again',
    tryAgainSub: 'Tap to restart voice recording',
    liveWaveform: 'Live Audio Waveform',
    handsFreeTitle: 'Hands-free consultation available',
    handsFreeDesc: 'You may speak naturally in full sentences or short phrases. Tap the microphone to begin.',
    audioNotice: 'Audio Notice',
    noSpeechDetected: "No speech was detected. Please tap and try speaking again.",
    micDenied: 'Microphone access was denied. Please allow permission or use touch options.',
    micUnavailable: 'No microphone detected. Please connect a microphone or use touch options.',
    micConnectError: 'Could not connect to microphone. Please check settings and try again.',
    micNotSupported: 'Microphone access is not supported on this browser. Please use touch options.',
    voiceNotSupported: 'Voice recording is not supported in this browser format. Please use touch options.',
    voiceProcessingFailed: 'Could not process audio format. Please tap and speak again.',
    transcribeFailed: 'Transcription failed. Please try again or use the touch options.',
    transcribeTimeout: 'Transcription request timed out. Please try again or use touch.',
    audioInstructionsUnavailable: 'Audio instructions are unavailable. Please read the instructions on screen.',
    aiSpeaking: 'AI is speaking...',
    aiSpeakingHint: 'Please listen to the question',

    // Completion Screen
    priorityAlert: 'Priority Clinical Alert',
    urgentAttentionTitle: 'Urgent Clinical Attention Required',
    urgentAttentionDesc: 'A high-priority medical symptom has been detected during your questionnaire. Please inform the nearest nurse or receptionist immediately. Hospital staff have been notified.',
    classification: 'Classification',
    emergencyPhoneLabel: 'Emergency Assistance: +91 98765 43210 (Ext: 101)',
    summarySaved: 'Consultation summary saved successfully.',
    returnToKiosk: 'Return to Kiosk Main Menu',
    intakeCompleted: 'Intake Completed',
    thankYou: 'Thank You',
    thankYouDesc: "Your preliminary health information has been recorded securely and transmitted to your doctor's clinical review dashboard.",
    savingSummary: 'Saving consultation summary...',
    summaryGenerated: 'Clinical summary generated successfully.',
    summarySaveError: 'Consultation completed, but your clinical summary could not be saved. Please contact staff.',
    retrySavingSummary: 'Retry Saving Summary',
    nextStepTitle: 'Next Step',
    nextStepDesc: 'Upload prior medical prescriptions or lab reports for AI digitization, or proceed to the OPD waiting lounge.',
    uploadMedicalDocs: 'Upload Medical Documents',
    doneReturnHome: 'Done • Return to Kiosk'
  },

  hi: {
    // KioskHome strings
    welcome: 'मल्टीस्पेशलिस्ट अस्पताल में आपका स्वागत है',
    subtitle: 'आपकी स्वास्थ्य यात्रा यहाँ से शुरू होती है।',
    description: 'परामर्श शुरू करने से पहले हम आपसे कुछ आसान सवाल पूछेंगे।',
    hear: 'निर्देश सुनें',
    stop: 'निर्देश रोकें',
    start: 'परामर्श शुरू करें',
    tap: 'शुरू करने के लिए बटन दबाएँ',
    protected: 'आपकी जानकारी सुरक्षित है',
    secure: 'सुरक्षित परामर्श',
    patientAssistance: 'रोगी सहायता',
    language: 'भाषा',
    selectLanguage: 'अपनी भाषा चुनें',
    speechText: 'मल्टीस्पेशलिस्ट अस्पताल में आपका स्वागत है। परामर्श शुरू करने से पहले हम आपसे कुछ आसान सवाल पूछेंगे। जब आप तैयार हों, तो परामर्श शुरू करें बटन दबाएँ।',
    copyright: '© 2026 मल्टीस्पेशलिस्ट अस्पताल',

    // Phase titles & subtitles
    phases: {
      chief_complaint: {
        title: 'मुख्य समस्या',
        subtitle: 'अपनी प्राथमिक स्वास्थ्य समस्या बताएं'
      },
      hpi: {
        title: 'वर्तमान बीमारी (HPI)',
        subtitle: 'लक्षणों के प्रकार, शुरुआत और अवधि को समझना'
      },
      extended_history: {
        title: 'चिकित्सा इतिहास',
        subtitle: 'पिछली बीमारियाँ, नियमित दवाएं और एलर्जी'
      },
      ros: {
        title: 'शारीरिक प्रणाली समीक्षा',
        subtitle: 'सामान्य शारीरिक प्रणालियों और लक्षणों की जांच'
      },
      ayush: {
        title: 'आयुष मूल्यांकन',
        subtitle: 'समग्र जीवनशैली और शारीरिक मूल्यांकन'
      }
    },

    // Initial complaint screen
    tellUsHealthProblem: 'अपनी स्वास्थ्य समस्या के बारे में बताएं',
    describeInOwnWords: 'कृपया अपने शब्दों में बताएं कि आप क्या महसूस कर रहे हैं।',
    optionVoice: 'विकल्प A: 🎤 बोलकर बताएं',
    optionText: 'विकल्प B: ⌨️ लिखकर बताएं',
    orTypeBelow: 'या नीचे अपने लक्षण लिखें',
    typePlaceholder: 'अपने शब्दों में लिखें कि आप क्या महसूस कर रहे हैं (उदा. मुझे 2 दिनों से बुखार, सिरदर्द और गले में खराश है)...',
    continueConsultation: 'परामर्श जारी रखें',
    submittingComplaint: 'आपकी स्वास्थ्य समस्या दर्ज की जा रही है...',

    // Navigation & Common
    consultationTitle: 'रोगी परामर्श',
    intakeDesk: 'परामर्श इनटेक डेस्क',
    exitConsultation: 'परामर्श से बाहर निकलें',
    session: 'सत्र',
    recordingAnswer: 'आपका उत्तर रिकॉर्ड किया जा रहा है...',
    connectionNotice: 'कनेक्शन सूचना',
    retry: 'पुनः प्रयास करें',
    preparingConsultation: 'आपका परामर्श तैयार किया जा रहा है',
    connectingEngine: 'चिकित्सा मूल्यांकन प्रणाली से सुरक्षित रूप से जुड़ रहे हैं...',
    loadingQuestion: 'अगला प्रश्न लोड हो रहा है...',
    orAnswerTouch: 'या नीचे दिए गए विकल्पों को स्पर्श करें',

    // Voice Recorder
    voiceAnswerOption: 'बोलकर उत्तर देने का विकल्प',
    speakingHint: 'बोल रहे हैं... समाप्त होने पर रोकें दबाएँ',
    sendingToEngine: 'चिकित्सा इंजन को भेजा जा रहा है',
    touchOrVoice: 'स्पर्श या आवाज़',
    tapToSpeak: 'बोलने के लिए दबाएँ',
    tapToSpeakSub: 'अपनी पसंदीदा भाषा में अपना उत्तर बोलें',
    allowMic: 'माइक्रोफ़ोन की अनुमति दें...',
    allowMicSub: 'ब्राउज़र में अनुमति संदेश की पुष्टि करें',
    listening: 'सुन रहे हैं...',
    listeningSub: 'उत्तर पूरा करने के लिए दबाएँ',
    processing: 'प्रक्रिया जारी है...',
    processingSub: 'आपकी आवाज़ का अनुवाद किया जा रहा है',
    processingBanner: 'वाक् पहचान प्रणाली द्वारा ऑडियो का अनुवाद किया जा रहा है...',
    tryAgain: 'पुनः प्रयास करें',
    tryAgainSub: 'दोबारा रिकॉर्ड करने के लिए दबाएँ',
    liveWaveform: 'लाइव ऑडियो तरंग',
    handsFreeTitle: 'बिना छुए परामर्श उपलब्ध है',
    handsFreeDesc: 'आप सामान्य रूप से पूरे वाक्य या छोटे शब्दों में बोल सकते हैं। शुरू करने के लिए माइक दबाएँ।',
    audioNotice: 'ऑडियो सूचना',
    noSpeechDetected: 'कोई आवाज़ नहीं सुनाई दी। कृपया दोबारा दबाकर बोलें।',
    micDenied: 'माइक्रोफ़ोन की अनुमति नहीं मिली। कृपया अनुमति दें या स्क्रीन छुएँ।',
    micUnavailable: 'माइक्रोफ़ोन नहीं मिला। कृपया माइक जोड़ें या स्क्रीन छुएँ।',
    micConnectError: 'माइक्रोफ़ोन से कनेक्ट नहीं हो सका। कृपया सेटिंग्स जांचें और पुनः प्रयास करें।',
    micNotSupported: 'इस ब्राउज़र पर माइक्रोफ़ोन समर्थित नहीं है। कृपया स्क्रीन का उपयोग करें।',
    voiceNotSupported: 'इस ब्राउज़र में वॉइस रिकॉर्डिंग समर्थित नहीं है। कृपया टच का उपयोग करें।',
    voiceProcessingFailed: 'ऑडियो संसाधित नहीं हो सका। कृपया पुनः बोलें।',
    transcribeFailed: 'अनुवाद विफल रहा। कृपया पुनः प्रयास करें या स्क्रीन छुएँ।',
    transcribeTimeout: 'समय समाप्त हो गया। कृपया पुनः प्रयास करें या स्क्रीन छुएँ।',
    audioInstructionsUnavailable: 'ऑडियो निर्देश उपलब्ध नहीं हैं। कृपया स्क्रीन पर दिए गए निर्देश पढ़ें।',
    aiSpeaking: 'AI बोल रहा है...',
    aiSpeakingHint: 'कृपया प्रश्न को ध्यान से सुनें',

    // Completion Screen
    priorityAlert: 'प्राथमिकता चिकित्सा अलर्ट',
    urgentAttentionTitle: 'तत्काल चिकित्सा ध्यान आवश्यक है',
    urgentAttentionDesc: 'आपकी प्रश्नावली के दौरान एक गंभीर लक्षण की पहचान हुई है। कृपया तुरंत निकटतम नर्स या रिसेप्शनिस्ट को सूचित करें। अस्पताल के कर्मचारियों को सूचित कर दिया गया है।',
    classification: 'वर्गीकरण',
    emergencyPhoneLabel: 'आपातकालीन सहायता: +91 98765 43210 (Ext: 101)',
    summarySaved: 'परामर्श सारांश सफलतापूर्वक सहेजा गया।',
    returnToKiosk: 'कियोस्क मुख्य मेनू पर लौटें',
    intakeCompleted: 'परामर्श पूर्ण',
    thankYou: 'धन्यवाद',
    thankYouDesc: 'आपकी प्राथमिक स्वास्थ्य जानकारी सुरक्षित रूप से दर्ज कर ली गई है और डॉक्टर के समीक्षा डैशबोर्ड पर भेज दी गई है।',
    savingSummary: 'परामर्श सारांश सहेजा जा रहा है...',
    summaryGenerated: 'चिकित्सा सारांश सफलतापूर्वक तैयार किया गया।',
    summarySaveError: 'परामर्श पूरा हो गया, लेकिन आपका सारांश सहेजा नहीं जा सका। कृपया कर्मचारियों से संपर्क करें।',
    retrySavingSummary: 'सारांश सहेजना पुनः प्रयास करें',
    nextStepTitle: 'अगला चरण',
    nextStepDesc: 'एआई डिजिटलीकरण के लिए अपनी पुरानी दवा पर्ची या लैब रिपोर्ट अपलोड करें, या ओपीडी प्रतीक्षा लाउंज में जाएं।',
    uploadMedicalDocs: 'चिकित्सा दस्तावेज अपलोड करें',
    doneReturnHome: 'पूर्ण • कियोस्क पर वापस जाएं'
  },

  gu: {
    // KioskHome strings
    welcome: 'મલ્ટીસ્પેશ્યાલિસ્ટ હોસ્પિટલમાં આપનું સ્વાગત છે',
    subtitle: 'તમારી આરોગ્ય યાત્રા અહીંથી શરૂ થાય છે.',
    description: 'પરામર્શ શરૂ કરતા પહેલા અમે તમને થોડા સરળ પ્રશ્નો પૂછીશું.',
    hear: 'સૂચનાઓ સાંભળો',
    stop: 'સૂચનાઓ બંધ કરો',
    start: 'પરામર્શ શરૂ કરો',
    tap: 'શરૂ કરવા માટે બટન દબાવો',
    protected: 'તમારી માહિતી સુરક્ષિત છે',
    secure: 'સુરક્ષિત પરામર્શ',
    patientAssistance: 'દર્દી સહાય',
    language: 'ભાષા',
    selectLanguage: 'તમારી ભાષા પસંદ કરો',
    speechText: 'મલ્ટીસ્પેશ્યાલિસ્ટ હોસ્પિટલમાં આપનું સ્વાગત છે. પરામર્શ શરૂ કરતા પહેલા અમે તમને થોડા સરળ પ્રશ્નો પૂછીશું. જ્યારે તમે તૈયાર હોવ ત્યારે પરામર્શ શરૂ કરો બટન દબાવો.',
    copyright: '© 2026 મલ્ટીસ્પેશ્યાલિસ્ટ હોસ્પિટલ',

    // Phase titles & subtitles
    phases: {
      chief_complaint: {
        title: 'મુખ્ય ફરિયાદ',
        subtitle: 'તમારી પ્રાથમિક આરોગ્ય સમસ્યા જણાવો'
      },
      hpi: {
        title: 'હાલની બીમારી (HPI)',
        subtitle: 'લક્ષણોની પેટર્ન, શરૂઆત અને સમયગાળો સમજવો'
      },
      extended_history: {
        title: 'તબીબી ઇતિહાસ',
        subtitle: 'અગાઉની સ્થિતિ, નિયમિત દવાઓ અને એલર્જી'
      },
      ros: {
        title: 'સિસ્ટમ સમીક્ષા',
        subtitle: 'શરીરના સામાન્ય અંગો અને સંબંધિત લક્ષણોની તપાસ'
      },
      ayush: {
        title: 'આયુષ મૂલ્યાંકન',
        subtitle: 'જીવનશૈલી અને શારીરિક મૂલ્યાંકન'
      }
    },

    // Initial complaint screen
    tellUsHealthProblem: 'તમારી સ્વાસ્થ્ય સમસ્યા વિશે જણાવો',
    describeInOwnWords: 'કૃપા કરીને તમારા પોતાના શબ્દોમાં વર્ણવો કે તમે શું અનુભવી રહ્યા છો.',
    optionVoice: 'વિકલ્પ A: 🎤 બોલીને જણાવો',
    optionText: 'વિકલ્પ B: ⌨️ લખીને જણાવો',
    orTypeBelow: 'અથવા નીચે તમારા લક્ષણો લખો',
    typePlaceholder: 'તમે શું અનુભવી રહ્યા છો તે તમારા પોતાના શબ્દોમાં લખો (દા.ત., મને 2 દિવસથી તાવ, માથાનો દુખાવો અને ગળામાં દુખાવો છે)...',
    continueConsultation: 'પરામર્શ આગળ વધારો',
    submittingComplaint: 'તમારી આરોગ્ય સમસ્યા નોંધાઈ રહી છે...',

    // Navigation & Common
    consultationTitle: 'દર્દી પરામર્શ',
    intakeDesk: 'પરામર્શ ઇનટેક ડેસ્ક',
    exitConsultation: 'પરામર્શમાંથી બહાર નીકળો',
    session: 'સત્ર',
    recordingAnswer: 'તમારો જવાબ નોંધાઈ રહ્યો છે...',
    connectionNotice: 'કનેક્શન સૂચના',
    retry: 'ફરી પ્રયાસ કરો',
    preparingConsultation: 'તમારો પરામર્શ તૈયાર થઈ રહ્યો છે',
    connectingEngine: 'તબીબી મૂલ્યાંકન એન્જિન સાથે સુરક્ષિત રીતે જોડાઈ રહ્યા છીએ...',
    loadingQuestion: 'આગળનો પ્રશ્ન લોડ થઈ રહ્યો છે...',
    orAnswerTouch: 'અથવા નીચે ટચ કરીને જવાબ આપો',

    // Voice Recorder
    voiceAnswerOption: 'બોલીને જવાબ આપવાનો વિકલ્પ',
    speakingHint: 'બોલી રહ્યા છો... પૂર્ણ થાય ત્યારે રોકો દબાવો',
    sendingToEngine: 'તબીબી એન્જિનમાં મોકલાઈ રહ્યું છે',
    touchOrVoice: 'ટચ અથવા અવાજ',
    tapToSpeak: 'બોલવા માટે દબાવો',
    tapToSpeakSub: 'તમારી પસંદગીની ભાષામાં તમારો જવાબ બોલો',
    allowMic: 'માઇક્રોફોનની મંજૂરી આપો...',
    allowMicSub: 'બ્રાઉઝરમાં પરવાનગી સ્વીકારો',
    listening: 'સાંભળી રહ્યા છીએ...',
    listeningSub: 'જવાબ પૂર્ણ કરવા માટે દબાવો',
    processing: 'પ્રક્રિયા ચાલુ છે...',
    processingSub: 'તમારા અવાજનું લખાણમાં રૂપાંતર થઈ રહ્યું છે',
    processingBanner: 'સ્પીચ રેકગ્નિશન એન્જિન દ્વારા ઑડિયોનું લખાણમાં રૂપાંતર થઈ રહ્યું છે...',
    tryAgain: 'ફરી પ્રયાસ કરો',
    tryAgainSub: 'ફરીથી રેકોર્ડ કરવા માટે દબાવો',
    liveWaveform: 'લાઈવ ઑડિયો તરંગ',
    handsFreeTitle: 'હાથ મુક્ત પરામર્શ ઉપલબ્ધ છે',
    handsFreeDesc: 'તમે સરળતાથી વાક્યો અથવા શબ્દોમાં બોલી શકો છો. શરૂ કરવા માટે માઇક દબાવો.',
    audioNotice: 'ઑડિયો સૂચના',
    noSpeechDetected: 'કોઈ અવાજ સંભળાયો નથી. કૃપા કરીને ફરીથી દબાવીને બોલો.',
    micDenied: 'માઇક્રોફોનની મંજૂરી નકારવામાં આવી છે. કૃપા કરીને મંજૂરી આપો અથવા સ્ક્રીન ટચ કરો.',
    micUnavailable: 'માઇક્રોફોન મળ્યો નથી. કૃપા કરીને માઇક જોડો અથવા સ્ક્રીન ટચ કરો.',
    micConnectError: 'માઇક્રોફોન સાથે કનેક્ટ થઈ શક્યું નથી. કૃપા કરીને સેટિંગ્સ તપાસો.',
    micNotSupported: 'આ બ્રાઉઝરમાં માઇક્રોફોન સપોર્ટ કરતું નથી. કૃપા કરીને સ્ક્રીન ટચ કરો.',
    voiceNotSupported: 'આ બ્રાઉઝરમાં વૉઇસ રેકોર્ડિંગ સપોર્ટેડ નથી. કૃપા કરીને ટચ વિકલ્પો વાપરો.',
    voiceProcessingFailed: 'ઑડિયો પ્રક્રિયા નિષ્ફળ રહી. કૃપા કરીને ફરી બોલો.',
    transcribeFailed: 'ટ્રાન્સક્રિપ્શન નિષ્ફળ ગયું. કૃપા કરીને ફરી પ્રયાસ કરો અથવા ટચ વિકલ્પો વાપરો.',
    transcribeTimeout: 'સમય સમાપ્ત થયો. કૃપા કરીને ફરી પ્રયાસ કરો અથવા ટચ વિકલ્પો વાપરો.',
    audioInstructionsUnavailable: 'ઑડિયો સૂચનાઓ ઉપલબ્ધ નથી. કૃપા કરીને સ્ક્રીન પરની સૂચનાઓ વાંચો.',
    aiSpeaking: 'AI બોલી રહ્યું છે...',
    aiSpeakingHint: 'કૃપા કરીને પ્રશ્ન ધ્યાનથી સાંભળો',

    // Completion Screen
    priorityAlert: 'પ્રાથમિકતા તબીબી ચેતવણી',
    urgentAttentionTitle: 'તાત્કાલિક તબીબી સારવાર જરૂરી છે',
    urgentAttentionDesc: 'તમારી પ્રશ્નાવલી દરમિયાન ગંભીર લક્ષણ જણાયું છે. કૃપા કરીને નજીકના નર્સ અથવા રિસેપ્શનિસ્ટને તાત્કાલિક જાણ કરો. હોસ્પિટલ સ્ટાફને જાણ કરવામાં આવી છે.',
    classification: 'વર્ગીકરણ',
    emergencyPhoneLabel: 'ઇમરજન્સી સહાય: +91 98765 43210 (Ext: 101)',
    summarySaved: 'પરામર્શ સારાંશ સફળતાપૂર્વક સાચવવામાં આવ્યો છે.',
    returnToKiosk: 'કિયોસ્ક મુખ્ય મેનૂ પર પાછા જાઓ',
    intakeCompleted: 'પરામર્શ પૂર્ણ',
    thankYou: 'આભાર',
    thankYouDesc: 'તમારી પ્રાથમિક સ્વાસ્થ્ય માહિતી સુરક્ષિત રીતે નોંધવામાં આવી છે અને ડૉક્ટરના રિવ્યૂ ડેશબોર્ડ પર મોકલી દેવામાં આવી છે.',
    savingSummary: 'પરામર્શ સારાંશ સંગ્રહિત થઈ રહ્યો છે...',
    summaryGenerated: 'તબીબી સારાંશ સફળતાપૂર્વક તૈયાર થયો છે.',
    summarySaveError: 'પરામર્શ પૂર્ણ થયો, પરંતુ તમારો સારાંશ સાચવી શકાયો નથી. કૃપા કરીને સ્ટાફનો સંપર્ક કરો.',
    retrySavingSummary: 'સારાંશ સાચવવાનો ફરી પ્રયાસ કરો',
    nextStepTitle: 'આગળનું પગલું',
    nextStepDesc: 'એઆઈ ડિજિટાઇઝેશન માટે જૂના પ્રિસ્ક્રિપ્શન અથવા લેબ રિપોર્ટ્સ અપલોડ કરો, અથવા ઓપીડી વેઇટિંગ લાઉન્જમાં આગળ વધો.',
    uploadMedicalDocs: 'તબીબી દસ્તાવેજો અપલોડ કરો',
    doneReturnHome: 'પૂર્ણ • કિયોસ્ક પર પાછા જાઓ'
  }
};

/**
 * Helper to get localized strings for a language code (e.g. 'en', 'en-IN', 'hi', 'hi-IN', 'gu', 'gu-IN').
 */
export function getKioskStrings(langCode = 'en') {
  if (!langCode) return kioskStrings.en;
  const base = langCode.split('-')[0].toLowerCase();
  return kioskStrings[base] || kioskStrings.en;
}

/**
 * Get localized phase metadata (title and subtitle) for a section key and language
 */
export function getLocalizedPhaseMeta(sectionKey, langCode = 'en') {
  const strings = getKioskStrings(langCode);
  const phase = strings.phases?.[sectionKey];
  if (phase) {
    return phase;
  }
  return {
    title: sectionKey ? sectionKey.toUpperCase().replace(/_/g, ' ') : strings.intakeDesk,
    subtitle: strings.connectingEngine
  };
}
