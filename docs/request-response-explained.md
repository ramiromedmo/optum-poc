# Optum API Request & Response Explained

## REQUEST BREAKDOWN

```json
{
  // CONTROL INFORMATION - Required for tracking
  "controlNumber": "123456789",           // Your unique 9-digit transaction ID
  "tradingPartnerServiceId": "CMSMED",    // Insurance company ID (CMS Medicare)
  
  // YOUR CLINIC/PROVIDER INFORMATION
  "provider": {
    "organizationName": "provider_name",   // Your clinic name
    "npi": "0123456789",                  // Your National Provider Identifier
    "serviceProviderNumber": "54321",      // Your provider number with this insurance
    "providerCode": "AD",                 // AD = Admitting provider type
    "referenceIdentification": "54321g"    // Additional provider reference ID
  },
  
  // PATIENT INFORMATION (Main subscriber)
  "subscriber": {
    "memberId": "0000000000",             // Patient's insurance member ID
    "firstName": "johnOne",               // Patient's first name
    "lastName": "doeOne",                 // Patient's last name
    "gender": "M",                        // M = Male
    "dateOfBirth": "18800102",           // January 2, 1880 (YYYYMMDD format)
    "ssn": "555443333",                  // Social Security Number
    "idCard": "card123"                  // Insurance card number
  },
  
  // FAMILY MEMBERS (Optional)
  "dependents": [
    {
      "firstName": "janeOne",             // Dependent's first name
      "lastName": "doeone",               // Dependent's last name
      "gender": "F",                      // F = Female
      "dateOfBirth": "18160421",         // April 21, 1816 (very old!)
      "groupNumber": "1111111111"         // Insurance group number
    }
  ],
  
  // WHAT SERVICES ARE YOU CHECKING?
  "encounter": {
    "beginningDateOfService": "20100101", // January 1, 2010 - service start date
    "endDateOfService": "20100102",       // January 2, 2010 - service end date
    "serviceTypeCodes": ["98", "88"]      // 98=Doctor visit, 88=Pharmacy
  }
}
```

**What you're asking:** "Is this patient covered for doctor visits (98) and pharmacy (88) services?"

---

## RESPONSE BREAKDOWN

```json
{
  // OPTUM'S TRACKING INFORMATION
  "meta": {
    "senderId": "MN_Medmo_APP",           // Optum's internal sender ID
    "applicationMode": "sandbox",          // You're using sandbox (test) environment
    "traceId": "06b0ccbe-9ba6-835f-fc31-b5a243d158c7"  // Unique ID for support
  },
  
  // ECHOING BACK YOUR REQUEST INFO
  "controlNumber": "123456789",           // Your original control number
  "reassociationKey": "123456789",        // Key to link request/response
  "tradingPartnerServiceId": "CMSMED",    // Insurance company you asked about
  
  // PROVIDER INFO (Your clinic, but cleaned up by insurance)
  "provider": {
    "providerName": "HAPPY DOCTORS GROUP PRACTICE",  // Insurance has your name on file
    "entityIdentifier": "Provider",        // You are identified as a provider
    "entityType": "Non-Person Entity",     // You're an organization, not individual
    "npi": "1234567893"                   // Your NPI (slightly different from request)
  },
  
  // PATIENT INFORMATION (Cleaned up by insurance)
  "subscriber": {
    "memberId": "0000000000",             // Patient's member ID confirmed
    "firstName": "JOHNONE",               // Name in ALL CAPS (insurance format)
    "lastName": "DOEONE",                 // Last name in ALL CAPS
    "middleName": "M",                    // Middle initial extracted from gender?
    "gender": "F",                        // ⚠️ CHANGED TO FEMALE (insurance has different data)
    "entityIdentifier": "Insured or Subscriber",  // Patient is the main subscriber
    "entityType": "Person",               // Patient is a person (not organization)
    "dateOfBirth": "18800102",           // Birth date confirmed
    "relationToSubscriber": "Self",       // Patient is the main subscriber (not dependent)
    "insuredIndicator": "Y",              // Y = Yes, patient is insured
    "maintenanceTypeCode": "001",         // Insurance maintenance code
    "maintenanceReasonCode": "25",        // Reason code for maintenance
    
    // PATIENT'S ADDRESS (From insurance records)
    "address": {
      "address1": "123 address1",         // Street address
      "city": "SEATTLE",                  // City
      "state": "WA",                      // Washington state
      "postalCode": "981010000"           // ZIP code
    }
  },
  
  // TRANSACTION TRACKING NUMBERS
  "subscriberTraceNumbers": [
    {
      "traceTypeCode": "2",               // Type 2 = Referenced transaction
      "traceType": "Referenced Transaction Trace Numbers",
      "referenceIdentification": "123456789",  // Your control number
      "originatingCompanyIdentifier": "9877281234"  // Insurance company's ID
    }
    // Second entry is duplicate (common in EDI)
  ],
  
  // INSURANCE COMPANY INFORMATION
  "payer": {
    "entityIdentifier": "Payer",          // This entity is the insurance payer
    "entityType": "Non-Person Entity",    // Insurance company (not a person)
    "name": "CMS",                        // Centers for Medicare & Medicaid Services
    "payorIdentification": "CMSMED"       // Insurance company ID
  },
  
  // WHEN IS COVERAGE ACTIVE?
  "planDateInformation": {
    "eligibility": "20211020-20211020"   // Coverage active on Oct 20, 2021 only
  },
  
  // HIGH-LEVEL COVERAGE STATUS
  "planStatus": [
    {
      "statusCode": "1",                  // 1 = Active Coverage
      "status": "Active Coverage",        // Human readable status
      // ALL SERVICES THIS PATIENT HAS COVERAGE FOR (huge list!)
      "serviceTypeCode": ["88","30","42",...,"98",...],  // Includes your requested 88 & 98
      "serviceTypeCodes": ["88","30","42",...,"98",...]   // Same list (duplicate field)
    }
  ],
  
  // 🔥 DETAILED BENEFITS INFORMATION (Most Important Section)
  "benefitsInformation": [
    
    // ❌ SERVICES NOT COVERED
    {
      "code": "I",                        // I = Non-Covered
      "name": "Non-Covered",
      "serviceTypeCodes": ["41","54"],    // 41=Preventive Dental, 54=Long Term Care
      "serviceTypes": ["Routine (Preventive) Dental","Long Term Care"]
    },
    
    // ✅ PHARMACY (88) - PRIMARY COVERAGE
    {
      "code": "1",                        // 1 = Active Coverage
      "name": "Active Coverage",
      "serviceTypeCodes": ["88"],         // 88 = Pharmacy (one of your requested codes!)
      "serviceTypes": ["Pharmacy"]
      // No insurance type = Primary coverage
    },
    
    // ✅ MEDICARE PART A SERVICES (Hospital/Inpatient)
    {
      "code": "1",                        // 1 = Active Coverage
      "name": "Active Coverage",
      "serviceTypeCodes": ["30","42","45","48","49","69","76","83","A5","A7","AG","BT","BU","BV"],
      "serviceTypes": ["Health Benefit Plan Coverage","Home Health Care","Hospice",
                      "Hospital - Inpatient","Hospital - Room and Board","Maternity",
                      "Dialysis","Infertility","Psychiatric - Room and Board",
                      "Psychiatric - Inpatient","Skilled Nursing Care",
                      "Gynecological","Obstetrical","Obstetrical/Gynecological"],
      "insuranceTypeCode": "MA",          // MA = Medicare Part A
      "insuranceType": "Medicare Part A",
      "benefitsDateInformation": {"plan": "20041101"},  // Plan started Nov 1, 2004
      "additionalInformation": [
        {"description": "0-Beneficiary insured due to age OASI"}  // Old Age Survivor Insurance
      ]
    },
    
    // 💰 MEDICARE PART A DEDUCTIBLE INFO
    {
      "code": "C",                        // C = Deductible
      "name": "Deductible",
      "serviceTypeCodes": ["30"],         // General health coverage
      "serviceTypes": ["Health Benefit Plan Coverage"],
      "insuranceTypeCode": "MA",          // Medicare Part A
      "insuranceType": "Medicare Part A",
      "timeQualifierCode": "26",          // 26 = Episode
      "timeQualifier": "Episode",
      "benefitAmount": "1484",            // $1,484 deductible per episode
      "benefitsDateInformation": {"plan": "20210101-20211231"}  // 2021 calendar year
    },
    
    // 💰 REMAINING DEDUCTIBLE
    {
      "code": "C",                        // C = Deductible
      "name": "Deductible", 
      "serviceTypeCodes": ["30"],
      "serviceTypes": ["Health Benefit Plan Coverage"],
      "insuranceTypeCode": "MA",          // Medicare Part A
      "insuranceType": "Medicare Part A",
      "timeQualifierCode": "29",          // 29 = Remaining
      "timeQualifier": "Remaining",
      "benefitAmount": "1484",            // $1,484 still owed (deductible not met)
      "benefitsDateInformation": {"plan": "20210101-20211231"}
    },
    
    // 💰 HOME HEALTH/HOSPICE DEDUCTIBLE (No cost)
    {
      "code": "C",                        // C = Deductible
      "name": "Deductible",
      "serviceTypeCodes": ["42","45"],    // 42=Home Health, 45=Hospice
      "serviceTypes": ["Home Health Care","Hospice"],
      "insuranceTypeCode": "MA",          // Medicare Part A
      "insuranceType": "Medicare Part A",
      "timeQualifierCode": "26",          // 26 = Episode
      "timeQualifier": "Episode",
      "benefitAmount": "0",               // $0 deductible (free!)
      "benefitsDateInformation": {"benefit": "20210101-20211231"}
    },
    
    // ✅ MEDICARE PART B SERVICES (Outpatient/Doctor visits)
    {
      "code": "1",                        // 1 = Active Coverage
      "name": "Active Coverage",
      // 🎯 INCLUDES YOUR REQUESTED CODE 98!
      "serviceTypeCodes": ["30","2","23",...,"98",...,"UC"],  // 98 = Doctor visit!
      "serviceTypes": ["Health Benefit Plan Coverage","Surgical","Diagnostic Dental",
                      ...,"Professional (Physician) Visit - Office",...,"Urgent Care"],
      "insuranceTypeCode": "MB",          // MB = Medicare Part B
      "insuranceType": "Medicare Part B",
      "benefitsDateInformation": {"plan": "20041101"},  // Plan started Nov 1, 2004
      "additionalInformation": [
        {"description": "0-Beneficiary insured due to age OASI"}  // Old Age Survivor Insurance
      ]
    },
    
    // 💰 MEDICARE PART B DEDUCTIBLE
    {
      "code": "C",                        // C = Deductible
      "name": "Deductible",
      "serviceTypeCodes": ["30"],         // General health coverage
      "serviceTypes": ["Health Benefit Plan Coverage"],
      "insuranceTypeCode": "MB",          // Medicare Part B
      "insuranceType": "Medicare Part B",
      "timeQualifierCode": "23",          // 23 = Calendar Year
      "timeQualifier": "Calendar Year",
      "benefitAmount": "203",             // $203 annual deductible
      "benefitsDateInformation": {"plan": "20210101-20211231"}  // 2021 calendar year
    },
    
    // 💰 REMAINING DEDUCTIBLE (Already met!)
    {
      "code": "C",                        // C = Deductible
      "name": "Deductible",
      "serviceTypeCodes": ["30"],
      "serviceTypes": ["Health Benefit Plan Coverage"],
      "insuranceTypeCode": "MB",          // Medicare Part B
      "insuranceType": "Medicare Part B", 
      "timeQualifierCode": "29",          // 29 = Remaining
      "timeQualifier": "Remaining",
      "benefitAmount": "0",               // $0 remaining (deductible already met!)
      "benefitsDateInformation": {"plan": "20210101-20211231"}
    },
    
    // 💰 CO-INSURANCE (Patient pays percentage)
    {
      "code": "A",                        // A = Co-Insurance
      "name": "Co-Insurance",
      "serviceTypeCodes": ["30"],         // General health coverage
      "serviceTypes": ["Health Benefit Plan Coverage"],
      "insuranceTypeCode": "MB",          // Medicare Part B
      "insuranceType": "Medicare Part B",
      "timeQualifierCode": "27",          // 27 = Visit
      "timeQualifier": "Visit",
      "benefitPercent": "0.2",            // 20% patient responsibility (80% covered)
      "benefitsDateInformation": {"plan": "20210101-20211231"}
    },
    
    // 💰 SOME SERVICES HAVE NO DEDUCTIBLE
    {
      "code": "C",                        // C = Deductible
      "name": "Deductible",
      "serviceTypeCodes": ["42","67","AJ"], // Home Health, Smoking Cessation, Alcoholism
      "serviceTypes": ["Home Health Care","Smoking Cessation","Alcoholism"],
      "insuranceTypeCode": "MB",          // Medicare Part B
      "insuranceType": "Medicare Part B",
      "timeQualifierCode": "23",          // 23 = Calendar Year
      "timeQualifier": "Calendar Year",
      "benefitAmount": "0",               // $0 deductible (free!)
      "benefitsDateInformation": {"benefit": "20210101-20211231"}
    },
    
    // 💰 THESE SERVICES ARE 100% COVERED
    {
      "code": "A",                        // A = Co-Insurance
      "name": "Co-Insurance",
      "serviceTypeCodes": ["42","67","AJ"], // Home Health, Smoking Cessation, Alcoholism
      "serviceTypes": ["Home Health Care","Smoking Cessation","Alcoholism"],
      "insuranceTypeCode": "MB",          // Medicare Part B
      "insuranceType": "Medicare Part B",
      "timeQualifierCode": "27",          // 27 = Visit
      "timeQualifier": "Visit",
      "benefitPercent": "0",              // 0% patient responsibility (100% covered!)
      "benefitsDateInformation": {"benefit": "20210101-20211231"}
    },
    
    // 🔄 PHARMACY (88) - SECONDARY COVERAGE
    {
      "code": "R",                        // R = Other or Additional Payor
      "name": "Other or Additional Payor",
      "serviceTypeCodes": ["88"],         // 88 = Pharmacy (your requested code again!)
      "serviceTypes": ["Pharmacy"],
      "insuranceTypeCode": "OT",          // OT = Other
      "insuranceType": "Other",
      "headerLoopIdentifierCode": "2120", // EDI loop identifier
      "trailerLoopIdentifierCode": "2120",
      
      // ADDITIONAL PLAN INFORMATION
      "benefitsAdditionalInformation": {
        "planNumber": "S5601",            // Specific plan number
        "planNetworkIdNumber": "203"      // Network ID
      },
      "benefitsDateInformation": {"benefit": "20210101"},  // Benefit start date
      
      // SECONDARY INSURANCE COMPANY INFO
      "benefitsRelatedEntity": {
        "entityIdentifier": "Payer",      // This is another insurance company
        "entityType": "Non-Person Entity",
        "entityName": "extra healthy insurance",  // Secondary insurance name
        "address": {
          "address1": "123 address1",     // Secondary insurance address
          "city": "Nashville",
          "state": "TN", 
          "postalCode": "37203"
        },
        "contactInformation": {
          "contacts": [
            {
              "communicationMode": "Telephone",
              "communicationNumber": "0000000000"  // Phone number
            },
            {
              "communicationMode": "Uniform Resource Locator (URL)",
              "communicationNumber": "www.testwebsite.com"  // Website
            }
          ]
        }
      },
      
      // DUPLICATE ENTITY INFO (Common in EDI)
      "benefitsRelatedEntities": [
        // Same information repeated
      ]
    }
  ],
  
  // RAW EDI X12 DATA (The original healthcare format)
  "x12": "ISA*00*          *01*SomePwd   *ZZ*EMDEON..."  // Raw EDI transaction
}
```

---

## SUMMARY: What This Response Tells You

### ✅ Your Requested Services:

**Service Code 98 (Doctor Visit):**
- ✅ **COVERED** under Medicare Part B
- 💰 **Deductible**: $0 remaining (already met for the year)
- 💰 **Co-insurance**: 20% patient pays, 80% insurance pays
- 📅 **Active**: Since November 1, 2004

**Service Code 88 (Pharmacy):**
- ✅ **PRIMARY COVERAGE**: Active (basic coverage)
- 🔄 **SECONDARY COVERAGE**: "Other or Additional Payor" through "extra healthy insurance"
- 📞 **Secondary Contact**: 0000000000, www.testwebsite.com

### 🏥 Patient's Complete Coverage:
- **Medicare Part A**: Hospital, inpatient, maternity, dialysis
- **Medicare Part B**: Doctor visits, outpatient, emergency, dental, vision
- **Secondary Insurance**: Additional pharmacy coverage
- **Not Covered**: Preventive dental, long-term care

### 💡 Key Insights:
1. **Patient is very old** (born 1880 - 145 years old!) - test data
2. **Gender mismatch**: You sent "M", insurance has "F" 
3. **Dual coverage**: Primary Medicare + Secondary private insurance
4. **Deductibles met**: Medicare Part B deductible already satisfied
5. **Good coverage**: Most services covered at 80-100%

This is a **comprehensive eligibility response** showing everything the patient is covered for, not just your requested codes!