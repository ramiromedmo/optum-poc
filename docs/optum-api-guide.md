# Optum Medical Eligibility API - Complete Guide

## Overview
This API checks if a patient is eligible for medical services and what benefits they have. It follows the EDI 270/271 standard (healthcare industry standard for eligibility verification).

Source: https://developer.optum.com/eligibilityandclaims/reference/medicaleligibility

## API Endpoint
```
POST https://sandbox-apigw.optum.com/medicalnetwork/eligibility/v3/
```

## Authentication
```
Authorization: Bearer Your-Access-Token
```

---

## REQUEST STRUCTURE

### Required Fields (Must Include)

#### 1. Control Information
```json
{
  "controlNumber": "123456789",           // REQUIRED: Exactly 9 digits
  "tradingPartnerServiceId": "CMSMED"     // REQUIRED: Insurance company ID
}
```

#### 2. Provider Information
```json
{
  "provider": {
    "organizationName": "provider_name",   // REQUIRED: Your clinic/hospital name
    "npi": "0123456789",                  // REQUIRED: Your National Provider ID
    "serviceProviderNumber": "54321",      // Provider number with insurance
    "providerCode": "AD",                 // Provider type (AD=Admitting, etc.)
    "referenceIdentification": "54321g"    // Additional provider ID
  }
}
```

#### 3. Patient Information (Subscriber)
```json
{
  "subscriber": {
    "memberId": "0000000000",             // REQUIRED: Patient's insurance ID
    "firstName": "johnOne",               // REQUIRED: Patient's first name
    "lastName": "doeOne",                 // REQUIRED: Patient's last name
    "gender": "M",                        // M or F
    "dateOfBirth": "18800102",           // YYYYMMDD format
    "ssn": "555443333",                  // Social Security Number
    "idCard": "card123"                  // Insurance card number
  }
}
```

#### 4. Service Information
```json
{
  "encounter": {
    "beginningDateOfService": "20100101",  // YYYYMMDD - when service starts
    "endDateOfService": "20100102",        // YYYYMMDD - when service ends
    "serviceTypeCodes": ["98", "88"]       // What services you're checking
  }
}
```

### Optional Fields

#### Dependents (Family Members)
```json
{
  "dependents": [
    {
      "firstName": "janeOne",
      "lastName": "doeone", 
      "gender": "F",
      "dateOfBirth": "18160421",
      "groupNumber": "1111111111"
    }
  ]
}
```

---

## RESPONSE STRUCTURE (Official Optum API)

### Success Response Structure
```json
{
  "meta": {
    "senderId": "string",              // Sender ID assigned by Optum
    "submitterId": "string",           // Submitter ID assigned by Optum
    "billerId": "string",              // Billing ID assigned by Optum
    "applicationMode": "string",       // Used by Optum for support
    "traceId": "string",               // Unique ID for each request
    "controlNumber": "string",         // Your original control number
    "tradingPartnerServiceId": "string" // Insurance company ID you sent
  },
  "provider": {
    // Provider information from response
  },
  "subscriber": {
    // Main patient/subscriber information
  },
  "dependents": [
    // Family members (if any)
  ],
  "payer": {
    // Insurance company information
  }
}
```

### Main Response Fields Explained

#### 1. Meta Information
```json
{
  "meta": {
    "traceId": "unique-id-123",        // Use this for support requests
    "controlNumber": "123456789",      // Your original control number
    "tradingPartnerServiceId": "CMSMED" // Insurance company ID
  }
}
```

#### 2. Provider Information (Your Clinic/Hospital)
```json
{
  "provider": {
    "providerName": "Your Clinic Name",     // Your organization name
    "providerFirstName": "John",            // If individual provider
    "providerOrgName": "Clinic Corp",       // Organization name
    "npi": "1234567890",                    // Your NPI number
    "providerCode": "AD",                   // Provider type code
    "address": {
      "address1": "123 Main St",            // Your address
      "city": "Anytown",
      "state": "CA",
      "postalCode": "12345"
    }
  }
}
```

#### 3. Subscriber Information (Main Patient)
```json
{
  "subscriber": {
    "memberId": "0000000000",               // Patient's insurance member ID
    "firstName": "JOHN",                    // Patient's first name (often uppercase)
    "lastName": "DOE",                      // Patient's last name
    "middleName": "MICHAEL",                // Middle name (if provided)
    "gender": "M",                          // M or F
    "dateOfBirth": "19800102",              // YYYYMMDD format
    "ssn": "555443333",                     // Social Security Number
    "groupNumber": "GRP123",                // Insurance group number
    "relationToSubscriber": "Self",         // Always "Self" for main patient
    "informationStatusCode": "A",           // A=Active, I=Inactive, etc.
    "address": {
      "address1": "456 Oak Ave",
      "city": "Hometown", 
      "state": "CA",
      "postalCode": "54321"
    }
  }
}
```

#### 4. Benefits Information (Most Important Section)
```json
{
  "subscriber": {
    "benefitsInformation": [
      {
        "code": "1",                        // Benefit status code
        "name": "Active Coverage",          // What the code means
        "coverageLevelCode": "IND",         // Individual, Family, etc.
        "coverageLevel": "Individual",      // Human readable coverage level
        "serviceTypeCodes": ["88"],         // Service codes this applies to
        "serviceTypes": ["Pharmacy"],       // Human readable service names
        "insuranceTypeCode": "HM",          // Type of insurance
        "insuranceType": "Health Maintenance Organization",
        "planCoverage": "Basic Plan",       // Plan description
        "benefitAmount": "1000.00",         // Dollar amount (if applicable)
        "benefitPercent": "80",             // Percentage covered (if applicable)
        "authOrCertIndicator": "Y",         // Y=Authorization required, N=Not required
        "inPlanNetworkIndicator": "Y"       // Y=In network, N=Out of network
      }
    ]
  }
}
```

#### 5. Payer Information (Insurance Company)
```json
{
  "payer": {
    "entityIdentifier": "PR",               // PR=Payer
    "entityType": "2",                      // 2=Non-person entity
    "name": "MEDICARE",                     // Insurance company name
    "npi": "1234567890",                    // Insurance company NPI
    "payorIdentification": "CMSMED",        // Insurance company ID
    "address": {
      "address1": "Insurance Plaza",
      "city": "Insurance City",
      "state": "DC", 
      "postalCode": "20001"
    }
  }
}
```


## MAPPING OPTUM RESPONSE TO THIS POC

### POC Response ← Optum Response
```javascript

{
  "eligible": subscriber.informationStatusCode === "A",
  "eligibilityStatus": subscriber.informationStatusCode === "A" ? "active" : "inactive", 
  "member": {
    "memberId": subscriber.memberId,
    "firstName": subscriber.firstName,
    "lastName": subscriber.lastName,
    "dateOfBirth": subscriber.dateOfBirth
  },
  "payer": {
    "name": payer.name,
    "payorIdentification": payer.payorIdentification
  },
  "benefits": subscriber.benefitsInformation.map(benefit => ({
    "serviceTypeCode": benefit.serviceTypeCodes[0],
    "serviceType": benefit.serviceTypes[0],
    "covered": benefit.code === "1", // Active coverage
    "coverageLevel": benefit.name,
    "copay": benefit.benefitAmount,
    "deductible": null, // Parse from different benefit entries
    "coinsurance": benefit.benefitPercent
  }))
}
```