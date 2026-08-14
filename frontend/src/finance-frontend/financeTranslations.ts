/**
 * Domain-Specific Modular Translations for Finance Module
 * Supports English (EN/en) and Telugu (TE/te)
 */

export type Language = 'EN' | 'TE' | 'en' | 'te';

export const financeTranslations = {
  EN: {
    // Header & Titles
    financeScreenTitle: 'Gold, Silver & Cash Loan Finance',
    financeScreenSub: 'Manage gold pledge loans, interest ledgers, collateral ornaments, and settlements',
    issueNewLoanBtn: 'Issue New Loan',
    fromLabel: 'From:',
    toLabel: 'To:',
    searchFinancePlaceholder: 'Search by name, phone, item, amount, date, timeline...',

    // Metric Summary Cards
    totalDebtPrincipal: 'TOTAL LOAN AMOUNT',
    activeLoanCapital: 'Total active loan money',
    interestAccrued: 'TOTAL INTEREST',
    livePerMonthInterest: 'Total monthly interest',
    openLoanAccounts: 'OPEN LOANS',
    activeInterestMonthly: 'Running loans',
    closedAccounts: 'CLOSED LOANS',
    fullySettled: 'Completed loans',

    // Table Header & Search
    pledgeLoanLedgerTitle: 'Pledge Loan Interest Ledger',

    // Status Filter Tabs & Metal Filter Pills
    allTab: 'All',
    pendingTab: 'Pending',
    completedTab: 'Completed',
    overdueTab: 'Overdue',
    deletedTab: 'Deleted',
    allMetals: 'All Metals',
    goldCategory: 'Gold',
    silverCategory: 'Silver',
    cashCategory: 'Cash',
    rowsPerPage: 'Rows per page:',
    showingRecords: 'Showing',
    ofRecords: 'of',
    recordsLabel: 'records',

    // Loan Table Column Headers
    snCol: 'S.No',
    loanDateCol: 'Loan Date',
    customerCol: 'Customer',
    itemCol: 'Item',
    debtAmountCol: 'Debt Amount',
    timelineCol: 'Timeline',
    monthlyRateCol: 'Monthly',
    totalAmountCol: 'Total Amount',
    itemValueCol: 'Item Value',
    statusHeader: 'Status',
    actionsCol: 'Actions',

    // Table Actions & Badges
    pendingBadge: 'Pending',
    completedBadge: 'Completed',
    overdueBadge: 'Overdue',
    deletedBadge: 'Deleted',
    settleLoanBtn: 'Settle / Pay',
    viewDetailsBtn: 'View Details',
    editLoanBtn: 'Edit Loan',
    deleteLoanBtn: 'Delete Loan',

    // Issue New Loan Modal
    girviProcessingBadge: 'Girvi Loan Processing',
    editLoanBadge: 'Edit Loan Record',
    issueLoanModalTitle: 'Issue New Pledge Loan',
    editLoanModalTitle: 'Edit Pledge Loan',
    goldRateLabel: 'Gold:',
    silverRateLabel: 'Silver:',

    assetDetailsSection: '1. Pledged Asset Details & Live Valuation',
    pledgedItemPhotoLabel: 'Pledged Item Photo',
    uploadPhotoPrompt: 'Upload Pledged Item Photo',
    supportsPhotoText: 'Supports JPEG, PNG, WebP · Max 5MB',
    browseGalleryBtn: 'Browse Gallery',
    liveCameraBtn: 'Live Camera',
    typeLabel: 'Type *',
    itemNameLabel: 'Item Name *',
    itemNamePlaceholder: 'e.g. 22K Gold Bangle Set',
    itemWeightLabel: 'Item Weight (Grams) *',
    itemDeductionNameLabel: 'Item Deduction Name',
    itemDeductionPlaceholder: 'e.g. Stones / Enamel / Wax',
    itemDeductionWeightLabel: 'Item Deduction Weight (Grams)',
    touchPurityLabel: 'Touch / Purity (%) *',
    pureMetalWeightLabel: 'Total Pure Metal Weight (Grams)',
    marketValueLabel: 'Estimated Market Value',
    liveMarketBadge: '(Live Market)',

    customerSection: '2. Customer Information',
    firstNameLabel: 'Customer First Name *',
    firstNamePlaceholder: 'e.g. Ramesh',
    surnameLabel: 'Surname / Initial',
    surnamePlaceholder: 'e.g. Vangapally',
    phoneLabel: 'Phone Number *',
    phonePlaceholder: '10-digit mobile number...',
    villageAddressLabel: 'Village / City Address',
    villageAddressPlaceholder: 'e.g. Patel Pura, Siddipet',

    financialSection: '3. Loan & Interest Terms',
    principalAmountLabel: 'Principal Loan Amount (₹) *',
    principalPlaceholder: 'e.g. 50000',
    interestRateLabel: 'Rate of Interest (%) *',
    timelineMonthsLabel: 'Timeline (Months) *',
    monthTimelineUnit: 'Month Timeline',
    monthsTimelineUnit: 'Months Timeline',
    perMonthText: 'per month',

    cancelBtn: 'Cancel',
    saveLoanBtn: 'Issue Loan & Generate Receipt',
    updateLoanBtn: 'Save Changes',
    processingLoanBtn: 'Processing Loan...',

    // Settlement Dialog
    settlementModalTitle: 'Confirm Loan Settlement',
    settlementDesc: 'Verify or adjust the final settlement interest for',
    monthWiseInterestTitle: 'Month-Wise (Rounded) Interest',
    settlementClosingDate: 'Settlement Closing Date:',
    finalInterestLabel: 'Final Interest:',
    confirmCompleteBtn: 'Confirm Complete',

    // Delete Confirmation Dialog
    deleteModalTitle: 'Delete Loan Record?',
    deleteModalWarning: 'This record will be moved to the Deleted tab. You can undo this action.',
    confirmDeleteBtn: 'Yes, Delete',

    // Photo Preview Lightbox
    pledgedPhotoVerification: 'Pledged Item Verification Photo',
    closePreviewBtn: 'Close Preview',
  },
  TE: {
    // Header & Titles
    financeScreenTitle: 'గోల్డ్, సిల్వర్ & క్యాష్ లోన్ ఫైనాన్స్',
    financeScreenSub: 'బంగారు కుదువ రుణాలు, వడ్డీ ఖాతాలు, తాకట్టు వస్తువులు మరియు సెటిల్‌మెంట్లను నిర్వహించండి',
    issueNewLoanBtn: 'కొత్త రుణం ఇవ్వండి',
    fromLabel: 'నుండి:',
    toLabel: 'వరకు:',
    searchFinancePlaceholder: 'పేరు, ఫోన్, వస్తువు, మొత్తం, తేదీ తో వెతకండి...',

    // Metric Summary Cards
    totalDebtPrincipal: 'మొత్తం అసలు రుణం',
    activeLoanCapital: 'నడుస్తున్న అసలు నిధి',
    interestAccrued: 'చేరిన వడ్డీ మొత్తం',
    livePerMonthInterest: 'నెలవారీ లెక్కించిన వడ్డీ',
    openLoanAccounts: 'నడుస్తున్న లోన్ ఖాతాలు',
    activeInterestMonthly: 'నెలసరి వడ్డీ లెక్కలు',
    closedAccounts: 'ముగిసిన లోన్ ఖాతాలు',
    fullySettled: 'పూర్తిగా సెటిల్ అయినవి',

    // Table Header & Search
    pledgeLoanLedgerTitle: 'తాకట్టు రుణాల వడ్డీ లెడ్జర్',

    // Status Filter Tabs & Metal Filter Pills
    allTab: 'అన్నీ',
    pendingTab: 'నడుస్తున్నవి',
    completedTab: 'పూర్తయినవి',
    overdueTab: 'గడువు ముగిసినవి',
    deletedTab: 'తొలగించినవి',
    allMetals: 'అన్ని లోహాలు',
    goldCategory: 'బంగారం',
    silverCategory: 'వెండి',
    cashCategory: 'నగదు',
    rowsPerPage: 'పేజీకి వరుసలు:',
    showingRecords: 'చూపిస్తున్నవి',
    ofRecords: 'మొత్తంలో',
    recordsLabel: 'రికార్డులు',

    // Loan Table Column Headers
    snCol: 'వ.సం',
    loanDateCol: 'రుణం తేదీ',
    customerCol: 'కస్టమర్',
    itemCol: 'వస్తువు',
    debtAmountCol: 'అసలు రుణం',
    timelineCol: 'గడువు',
    monthlyRateCol: 'వడ్డీ రేటు',
    totalAmountCol: 'మొత్తం బకాయి',
    itemValueCol: 'వస్తువు విలువ',
    statusHeader: 'స్టేటస్',
    actionsCol: 'చర్యలు',

    // Table Actions & Badges
    pendingBadge: 'నడుస్తోంది',
    completedBadge: 'పూర్తయింది',
    overdueBadge: 'గడువు ముగిసింది',
    deletedBadge: 'తొలగించబడింది',
    settleLoanBtn: 'సెటిల్ / చెల్లించు',
    viewDetailsBtn: 'వివరాలు చూడండి',
    editLoanBtn: 'సవరించు',
    deleteLoanBtn: 'తొలగించు',

    // Issue New Loan Modal
    girviProcessingBadge: 'గిర్వీ లోన్ ప్రాసెసింగ్',
    editLoanBadge: 'లోన్ రికార్డు సవరణ',
    issueLoanModalTitle: 'కొత్త తాకట్టు రుణం జారీ',
    editLoanModalTitle: 'తాకట్టు రుణం సవరణ',
    goldRateLabel: 'బంగారం ధర:',
    silverRateLabel: 'వెండి ధర:',

    assetDetailsSection: '1. తాకట్టు వస్తువు వివరాలు & మార్కెట్ విలువ',
    pledgedItemPhotoLabel: 'తాకట్టు వస్తువు ఫోటో',
    uploadPhotoPrompt: 'తాకట్టు వస్తువు ఫోటో అప్‌లోడ్ చేయండి',
    supportsPhotoText: 'JPEG, PNG, WebP కి సపోర్ట్ చేస్తుంది · గరిష్టం 5MB',
    browseGalleryBtn: 'గ్యాలరీ నుండి ఎంచుకోండి',
    liveCameraBtn: 'లైవ్ కెమెరా',
    typeLabel: 'రకం *',
    itemNameLabel: 'వస్తువు పేరు *',
    itemNamePlaceholder: 'ఉదా: 22K బంగారు గాజుల సెట్',
    itemWeightLabel: 'వస్తువు బరువు (గ్రాములు) *',
    itemDeductionNameLabel: 'తగ్గింపు (తరుగు/రాళ్ళు) పేరు',
    itemDeductionPlaceholder: 'ఉదా: రాళ్ళు / మైనం',
    itemDeductionWeightLabel: 'తగ్గింపు బరువు (గ్రాములు)',
    touchPurityLabel: 'టచ్ / మేలిమి శాతం (%) *',
    pureMetalWeightLabel: 'మొత్తం మేలిమి లోహం బరువు (గ్రాములు)',
    marketValueLabel: 'అంచనా మార్కెట్ విలువ',
    liveMarketBadge: '(లైవ్ మార్కెట్)',

    customerSection: '2. కస్టమర్ వివరాలు',
    firstNameLabel: 'కస్టమర్ మొదటి పేరు *',
    firstNamePlaceholder: 'ఉదా: రమేష్',
    surnameLabel: 'ఇంటిపేరు / పేరు ముందరి అక్షరం',
    surnamePlaceholder: 'ఉదా: వంగపల్లి',
    phoneLabel: 'ఫోన్ నంబరు *',
    phonePlaceholder: '10 అంకెల మొబైల్ నంబరు...',
    villageAddressLabel: 'గ్రామం / ఊరు చిరునామా',
    villageAddressPlaceholder: 'ఉదా: పటేల్ పుర, సిద్దిపేట',

    financialSection: '3. రుణం & వడ్డీ వివరాలు',
    principalAmountLabel: 'అసలు రుణం మొత్తం (₹) *',
    principalPlaceholder: 'ఉదా: 50000',
    interestRateLabel: 'వడ్డీ రేటు (%) *',
    timelineMonthsLabel: 'రుణం గడువు (నెలలు) *',
    monthTimelineUnit: 'నెల గడువు',
    monthsTimelineUnit: 'నెలల గడువు',
    perMonthText: 'నెలకూ',

    cancelBtn: 'క్యాన్సిల్',
    saveLoanBtn: 'రుణం జారీ చేయి & రసీదు ముద్రించు',
    updateLoanBtn: 'మార్పులు సేవ్ చేయి',
    processingLoanBtn: 'ప్రాసెస్ అవుతోంది...',
    savingLoanBtn: 'ప్రాసెస్ అవుతోంది...',

    // Settlement Dialog
    settlementModalTitle: 'రుణం సెటిల్‌మెంట్ ఖాయం చేయండి',
    settlementDesc: 'తుది సెటిల్‌మెంట్ వడ్డీని సరిచూసుకోండి:',
    monthWiseInterestTitle: 'నెలవారీ లెక్కించిన వడ్డీ',
    settlementClosingDate: 'సెటిల్‌మెంట్ ముగింపు తేదీ:',
    finalInterestLabel: 'తుది వడ్డీ:',
    confirmCompleteBtn: 'పూర్తి చేసి సెటిల్ చేయి',

    // Delete Confirmation Dialog
    deleteModalTitle: 'రుణం రికార్డును తొలగించాలా?',
    deleteModalWarning: 'ఈ రికార్డు తొలగించిన ట్యాబ్‌కు తరలించబడుతుంది. మీరు ఈ చర్యను వెనక్కి తీసుకోగలరు.',
    confirmDeleteBtn: 'అవును, తొలగించు',

    // Photo Preview Lightbox
    pledgedPhotoVerification: 'తాకట్టు వస్తువు పరిశీలన ఫోటో',
    closePreviewBtn: 'మూసివేయి',
  },
};

export const getFinanceTranslation = (lang?: Language) => {
  const upper = (lang || 'EN').toUpperCase();
  return upper === 'TE' ? financeTranslations.TE : financeTranslations.EN;
};
