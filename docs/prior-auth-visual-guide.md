# Prior Authorization Visual Guide

## 🎯 **The Big Picture**

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRIOR AUTHORIZATION WORKFLOW                 │
└─────────────────────────────────────────────────────────────────┘

    👨‍⚕️ Doctor                    🏥 Your API                 🏢 Insurance
       │                           │                           │
       │ "Patient needs MRI"       │                           │
       │ ─────────────────────────▶│                           │
       │                           │                           │
       │                           │ 1. SUBMISSION API         │
       │                           │ ─────────────────────────▶│
       │                           │   "Please approve MRI"    │
       │                           │                           │
       │                           │ ◀─────────────────────────│
       │                           │   "AUTH123456" (pending)  │
       │                           │                           │
       │                           │ 2. INQUIRY API (later)    │
       │                           │ ─────────────────────────▶│
       │                           │   "Status of AUTH123456?" │
       │                           │                           │
       │                           │ ◀─────────────────────────│
       │                           │   "APPROVED" ✅           │
       │ ◀─────────────────────────│                           │
       │ "Approved! Do the MRI"    │                           │
```

---

## 🔄 **Two APIs Explained**

```
┌─────────────────────────────────────────────────────────────────┐
│                         SUBMISSION API                          │
│                    "Please approve this"                        │
└─────────────────────────────────────────────────────────────────┘

INPUT:                           OUTPUT:
┌─────────────────────┐         ┌─────────────────────┐
│ Patient Info        │         │ Authorization ID    │
│ • John Doe          │         │ "AUTH123456"        │
│ • Member ID         │   ────▶ │                     │
│ • Birth Date        │         │ Review ID           │
│                     │         │ "REV789"            │
│ Treatment Details   │         │                     │
│ • MRI Brain         │         │ Status              │
│ • CPT Code: 70553   │         │ "Pending Review"    │
│ • Cost: $3,000      │         │                     │
└─────────────────────┘         └─────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          INQUIRY API                            │
│                   "What's the status?"                          │
└─────────────────────────────────────────────────────────────────┘

INPUT:                           OUTPUT:
┌─────────────────────┐         ┌─────────────────────┐
│ Patient Info        │         │ Decision            │
│ • John Doe          │         │ "APPROVED" ✅       │
│ • Member ID         │   ────▶ │                     │
│                     │         │ Valid Dates         │
│ Previous Auth       │         │ 2023-10-17 to       │
│ • "AUTH123456"      │         │ 2023-11-17          │
│                     │         │                     │
└─────────────────────┘         └─────────────────────┘
```

---

## 👥 **Subscriber vs Dependent**

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUBSCRIBER ONLY REQUEST                      │
│                 "Treatment for main patient"                    │
└─────────────────────────────────────────────────────────────────┘

    👨 John Doe (Dad)
    💳 Insurance Card: ZCS12345678
    🏥 Needs: MRI Brain
    
    REQUEST INCLUDES:
    ┌─────────────────────┐
    │ subscriber: {       │
    │   firstName: "John" │
    │   lastName: "Doe"   │
    │   memberId: "ZCS..."│
    │ }                   │
    │                     │
    │ ❌ NO dependent     │
    └─────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   WITH DEPENDENT REQUEST                        │
│                "Treatment for family member"                    │
└─────────────────────────────────────────────────────────────────┘

    👨 John Doe (Dad)          👧 Mary Doe (Daughter)
    💳 Insurance Card: ZCS...   🏥 Needs: Checkup
    
    REQUEST INCLUDES:
    ┌─────────────────────┐
    │ subscriber: {       │
    │   firstName: "John" │  ← Dad's insurance
    │   lastName: "Doe"   │
    │   memberId: "ZCS..."│
    │ }                   │
    │                     │
    │ dependent: {        │
    │   firstName: "Mary" │  ← Daughter gets treatment
    │   lastName: "Doe"   │
    │   dateOfBirth: "..." │
    │ }                   │
    └─────────────────────┘
```

---

## 🔗 **Complete Healthcare Workflow Diagram**

```
┌─────────────────────────────────────────────────────────────────┐
│                 COMPLETE HEALTHCARE API WORKFLOW                │
│              Eligibility → Prior Auth → Treatment               │
└─────────────────────────────────────────────────────────────────┘

STEP 1: CHECK ELIGIBILITY (Your Current POC)
┌─────────────────────┐    POST /eligibility   ┌─────────────────────┐
│ Your Hospital       │ ─────────────────────▶ │ Optum API           │
│                     │                        │                     │
│ Patient: John Doe   │                        │ Checking coverage...│
│ Service: MRI (98)   │                        │                     │
│ Member ID: ZCS...   │                        │                     │
└─────────────────────┘                        └─────────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────────┐
                                               │ RESPONSE:           │
                                               │ eligible: true      │
                                               │ covered: true       │
                                               │ authRequired: true  │
                                               │                     │
                                               │ ⚠️ Need Prior Auth  │
                                               └─────────────────────┘

STEP 2: SUBMIT PRIOR AUTH REQUEST
┌─────────────────────┐    POST /submission    ┌─────────────────────┐
│ Your Hospital       │ ─────────────────────▶ │ Optum API           │
│                     │                        │                     │
│ Patient: John Doe   │                        │ Processing...       │
│ Procedure: MRI      │                        │                     │
│ Cost: $3,000        │                        │                     │
│ Diagnosis: R51      │                        │                     │
└─────────────────────┘                        └─────────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────────┐
                                               │ RESPONSE:           │
                                               │ authorizationId:    │
                                               │ "AUTH123456"        │
                                               │                     │
                                               │ Status: "Pending"   │
                                               └─────────────────────┘

⏰ WAIT (minutes, hours, or days)

STEP 3: CHECK PRIOR AUTH STATUS
┌─────────────────────┐    POST /inquiry       ┌─────────────────────┐
│ Your Hospital       │ ─────────────────────▶ │ Optum API           │
│                     │                        │                     │
│ Check status of:    │                        │ Looking up...       │
│ "AUTH123456"        │                        │                     │
└─────────────────────┘                        └─────────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────────┐
                                               │ RESPONSE:           │
                                               │ Status: "APPROVED"  │
                                               │ Valid: 30 days      │
                                               │                     │
                                               │ ✅ Proceed with MRI │
                                               └─────────────────────┘

STEP 4: PERFORM TREATMENT
┌─────────────────────┐                        ┌─────────────────────┐
│ Your Hospital       │                        │ Patient             │
│                     │                        │                     │
│ "Approved!"         │ ─────────────────────▶ │ Gets MRI            │
│ Perform MRI         │                        │ Insurance pays      │
│                     │                        │                     │
└─────────────────────┘                        └─────────────────────┘


```

---

