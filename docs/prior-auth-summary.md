# Prior Authorization APIs - Complete Summary

## 🎯 **What Are These APIs?**

**Prior Authorization** = Getting insurance approval BEFORE performing expensive treatments.

**Real Example:**
- Patient needs MRI ($3,000)
- Doctor must ask insurance: "Can I do this MRI?"
- Insurance reviews and says: "Approved" or "Denied"
- Without approval, insurance won't pay

---

## 🔄 **Two APIs Explained**

### **INQUIRY API** - "What's the status?"
**Purpose**: Check status of previously submitted prior auth requests
**When to use**: After you've already submitted a request and want to know if it's approved

### **SUBMISSION API** - "Please approve this treatment"
**Purpose**: Submit NEW prior authorization requests
**When to use**: Before performing a treatment that requires approval

---

## 📋 **INQUIRY API - Detailed Breakdown**

### **What It Does:**
- Checks status of existing prior auth requests
- Returns approval/denial/pending status
- Tracks requests by authorization number or reference number

### **Key Required Fields:**
```json
{
  "senderId": "your-optum-id",                    // Your Optum sender ID
  "payerId": "BCBSSC",                           // Insurance company
  "requester": {
    "organizationName": "Your Hospital",         // Your hospital name
    "npi": "1234567890"                         // Your provider ID
  },
  "subscriber": {
    "lastName": "DOE",                          // Patient last name
    "firstName": "JOHN",                        // Patient first name
    "memberId": "ZCS12345678",                  // Patient insurance ID
    "dateOfBirth": "19701231"                   // Patient birth date
  },
  "patientEventDetail": {
    "requestCategoryCode": "HS",                // Health Services
    "serviceTypeCode": "1",                     // Medical care
    "eventDateBegin": "20231017",              // Treatment date
    "previousReviewAuthorizationNumber": "AUTH123456" // 🔍 KEY: Auth ID from SUBMISSION response
  }
}
```

### **What You Get Back:**
```json
{
  "authorizationId": "AUTH123456",
  "json": {
    "patientEventDetail": {
      "reviewIdentificationNumber": "REV789",   // Review ID
      "reviewDecisionReasonCode": "A1",         // Decision code (meaning not documented)
      "certificationActionCode": "string"       // Action taken
    }
  }
}
```

### **Response Codes:**
**Note**: The official Optum documentation shows these fields but doesn't specify the exact code meanings:
- `responseCode`: "string" - Response status code
- `rejectReasonCode`: "string" - Reason for rejection (if any)
- `reviewDecisionReasonCode`: "string" - Decision reason code

---

## 🔥 **SUBMISSION API - Detailed Breakdown**

### **What It Does:**
- Submits NEW prior authorization requests
- Asks insurance to approve specific treatments
- Provides detailed procedure and cost information

### **Key Required Fields:**
```json
{
  "senderId": "your-optum-id",
  "payerId": "BCBSSC",
  "requester": {
    "organizationName": "Your Hospital",
    "npi": "1234567890"
  },
  "subscriber": {
    "lastName": "DOE",
    "firstName": "JOHN", 
    "memberId": "ZCS12345678",
    "dateOfBirth": "19701231"
  },
  "patientEventDetail": {
    "requestCategoryCode": "HS",
    "serviceTypeCode": "1",
    "eventDateBegin": "20231017",
    "diagnosisCode": "R06.02",                 // 🔥 WHY treatment is needed
    "serviceLevel": [                          // 🔥 WHAT you want to do
      {
        "requestCategoryCode": "HS",
        "serviceDateBegin": "20231017",
        "professionalService": {
          "productOrServiceIDQualifier": "HC",
          "procedureCode": "71260",            // 🔥 SPECIFIC procedure (CT scan)
          "procedureCodeDescription": "CT scan of chest with contrast",
          "serviceLineAmount": "2000.00"       // 🔥 HOW MUCH it costs
        }
      }
    ]
  }
}
```

### **What You Get Back:**
```json
{
  "authorizationId": "AUTH123456",             // New authorization number
  "json": {
    "patientEventDetail": {
      "reviewIdentificationNumber": "REV789", // Track with this number
      "reviewDecisionReasonCode": "A1"        // Immediate decision (if available)
    }
  }
}
```

---

## 👥 **Subscriber vs Dependent Requests**

### **"Inquiry Request Subscribers Only"**
**What it means**: Checking authorization for the **main patient** (the person who has the insurance)

```json
{
  "subscriber": {
    "lastName": "DOE",
    "firstName": "JOHN",                     // Main insurance holder
    "memberId": "ZCS12345678"               // His insurance card
  }
  // NO "dependent" field
}
```

### **"Inquiry Request with Dependent"**
**What it means**: Checking authorization for a **family member** (spouse, child) covered under the main patient's insurance

```json
{
  "subscriber": {
    "lastName": "DOE", 
    "firstName": "JOHN",                     // Main insurance holder
    "memberId": "ZCS12345678"               // His insurance card
  },
  "dependent": {
    "lastName": "DOE",
    "firstName": "MARY",                     // His daughter
    "dateOfBirth": "20100123"               // Child's birth date
  }
}
```

**Simple Explanation:**
- **Subscriber Only** = Treatment for dad (John)
- **With Dependent** = Treatment for dad's daughter (Mary), but using dad's insurance

---

## 📊 **Concise Request Examples**

### **INQUIRY - Check Status (Subscriber Only)**
```json
{
  "senderId": "201985AAS",
  "payerId": "BCBSSC",
  "payerName": "South Carolina Blue Cross Blue",
  "requester": {
    "requesterType": "1P",
    "organizationName": "Regional Medical Center",
    "npi": "1234567890"
  },
  "subscriber": {
    "lastName": "TEST",
    "firstName": "BRITTANY",
    "memberId": "ZCS12345678",
    "dateOfBirth": "19701231"
  },
  "patientEventDetail": {
    "requestCategoryCode": "HS",
    "serviceTypeCode": "1",
    "eventDateBegin": "20231017",
    "previousReviewAuthorizationNumber": "AUTH123456"
  }
}
```

### **INQUIRY - Check Status (With Dependent)**
```json
{
  "senderId": "201985AAS",
  "payerId": "BCBSSC", 
  "payerName": "South Carolina Blue Cross Blue",
  "requester": {
    "requesterType": "1P",
    "organizationName": "Regional Medical Center",
    "npi": "1234567890"
  },
  "subscriber": {
    "lastName": "TEST",
    "firstName": "BRITTANY",              // Mom's insurance
    "memberId": "ZCS12345678",
    "dateOfBirth": "19701231"
  },
  "dependent": {
    "lastName": "TEST", 
    "firstName": "MARY",                  // Daughter getting treatment
    "dateOfBirth": "20100123"
  },
  "patientEventDetail": {
    "requestCategoryCode": "HS",
    "serviceTypeCode": "1", 
    "eventDateBegin": "20231017",
    "previousReviewAuthorizationNumber": "AUTH123456"
  }
}
```

### **SUBMISSION - Request Approval (Subscriber Only)**
```json
{
  "senderId": "201985AAS",
  "payerId": "BCBSSC",
  "payerName": "South Carolina Blue Cross Blue", 
  "requester": {
    "requesterType": "1P",
    "organizationName": "Regional Medical Center",
    "npi": "1234567890"
  },
  "subscriber": {
    "lastName": "TEST",
    "firstName": "BRITTANY",
    "memberId": "ZCS12345678",
    "dateOfBirth": "19701231"
  },
  "patientEventDetail": {
    "requestCategoryCode": "HS",
    "certificationTypeCode": "I",
    "serviceTypeCode": "1",
    "facilityTypeCode": "11",
    "eventDateBegin": "20231017",
    "diagnosisCode": "R06.02",            // Shortness of breath
    "serviceLevel": [
      {
        "requestCategoryCode": "HS",
        "serviceDateBegin": "20231017",
        "professionalService": {
          "productOrServiceIDQualifier": "HC",
          "procedureCode": "71260",       // CT scan of chest
          "serviceLineAmount": "2000.00"
        }
      }
    ]
  }
}
```

### **SUBMISSION - Request Approval (With Dependent)**
```json
{
  "senderId": "201985AAS",
  "payerId": "BCBSSC",
  "payerName": "South Carolina Blue Cross Blue",
  "requester": {
    "requesterType": "1P", 
    "organizationName": "Regional Medical Center",
    "npi": "1234567890"
  },
  "subscriber": {
    "lastName": "TEST",
    "firstName": "BRITTANY",              // Mom's insurance
    "memberId": "ZCS12345678",
    "dateOfBirth": "19701231"
  },
  "dependent": {
    "lastName": "TEST",
    "firstName": "MARY",                  // Daughter needs treatment
    "dateOfBirth": "20100123"
  },
  "patientEventDetail": {
    "requestCategoryCode": "HS",
    "certificationTypeCode": "I",
    "serviceTypeCode": "1",
    "facilityTypeCode": "11", 
    "eventDateBegin": "20231017",
    "diagnosisCode": "Z00.129",           // Routine child health exam
    "serviceLevel": [
      {
        "requestCategoryCode": "HS",
        "serviceDateBegin": "20231017",
        "professionalService": {
          "productOrServiceIDQualifier": "HC",
          "procedureCode": "99213",       // Office visit
          "serviceLineAmount": "200.00"
        }
      }
    ]
  }
}
```

---

## 📋 **Typical Response Examples**

### **INQUIRY Response - Example**
```json
{
  "authorizationId": "AUTH123456",
  "json": {
    "requestValidation": [
      {
        "responseCode": "A1",             // Response code (meaning not documented)
        "rejectReasonCode": null,
        "followupActionCode": null
      }
    ],
    "patientEventDetail": {
      "reviewIdentificationNumber": "REV789",
      "reviewDecisionReasonCode": "A1",   // Decision code (meaning not documented)
      "certificationActionCode": "A1"
    }
  }
}
```

### **INQUIRY Response - Example with Rejection**
```json
{
  "authorizationId": null,
  "json": {
    "requestValidation": [
      {
        "responseCode": "A3",             // Response code (meaning not documented)
        "rejectReasonCode": "T4",         // Rejection reason code (meaning not documented)
        "followupActionCode": "C"         // Follow-up action code (meaning not documented)
      }
    ],
    "patientEventDetail": {
      "reviewDecisionReasonCode": "A3"    // Decision code (meaning not documented)
    }
  }
}
```

### **SUBMISSION Response - Example**
```json
{
  "authorizationId": "AUTH789012",        // New authorization number
  "json": {
    "requestValidation": [
      {
        "responseCode": "A1",             // Response code (meaning not documented)
        "followupActionCode": null
      }
    ],
    "patientEventDetail": {
      "reviewIdentificationNumber": "REV456",
      "reviewDecisionReasonCode": "A1",   // Decision code (meaning not documented)
      "certificationEffectiveDateBegin": "20231017",
      "certificationExpirationDateEnd": "20231117"  // Valid for 30 days
    }
  }
}
```

---

## 🎯 **Key Differences Summary**

| Aspect | INQUIRY | SUBMISSION |
|--------|---------|------------|
| **Purpose** | Check status | Request approval |
| **When to use** | After submitting | Before treatment |
| **Key field** | `previousReviewAuthorizationNumber` | `serviceLevel` array |
| **Response** | Status of existing request | New authorization number |
| **Required info** | Previous auth number | Detailed procedures & costs |

## 💡 **Important Notes**

### **Subscriber vs Dependent:**
- **Subscriber** = Main insurance holder (parent, spouse)
- **Dependent** = Family member covered under subscriber's plan
- **Both requests use subscriber's insurance card number**
---


## 🔗 **Complete Workflow Example**

### **Step 1: Submit Prior Auth Request**
```json
POST /rcm/prior-authorization/v1/submission
{
  // ... your submission request
}

// Response:
{
  "authorizationId": "AUTH123456",           // ← Save this!
  "json": {
    "patientEventDetail": {
      "reviewIdentificationNumber": "REV789" // ← Or save this!
    }
  }
}
```

### **Step 2: Check Status Later**
```json
POST /rcm/prior-authorization/v1/inquiry
{
  "senderId": "201985AAS",
  "payerId": "BCBSSC",
  "requester": { /* same as submission */ },
  "subscriber": { /* same as submission */ },
  "patientEventDetail": {
    "requestCategoryCode": "HS",
    "serviceTypeCode": "1",
    "eventDateBegin": "20231017",
    
    // Use EITHER of these tracking fields:
    "previousReviewAuthorizationNumber": "AUTH123456", // From authorizationId
    // OR
    "previousAdministrativeReferenceNumber": "REV789"  // From reviewIdentificationNumber
  }
}
```

### **Step 3: Get Status Response**
```json
{
  "authorizationId": "AUTH123456",  // Same as original (if approved)
  "json": {
    "requestValidation": [
      {
        "responseCode": "A1",       // Response code (meanings not in official docs)
        "rejectReasonCode": "T4",   // Rejection reason (meanings not in official docs)
        "followupActionCode": "C"   // Follow-up action (meanings not in official docs)
      }
    ]
  }
}
```