import React from "react";
import { Shield } from "lucide-react";
import LegalLayout, { LegalSection, LegalList } from "./LegalLayout";

const SECTIONS = [
  { id: "scope", title: "Scope of This Policy" },
  { id: "data-collected", title: "Data Collected" },
  { id: "purpose", title: "Purpose of Data Processing" },
  { id: "controller", title: "Data Controller and Processor" },
  { id: "access", title: "Data Access and Disclosure" },
  { id: "retention", title: "Data Retention" },
  { id: "security", title: "Data Security" },
  { id: "cookies", title: "Cookies and Session Data" },
  { id: "rights", title: "Rights and Requests" },
  { id: "changes", title: "Changes to This Policy" },
  { id: "contact", title: "Contact" },
];

const PrivacyPolicy: React.FC = () => (
  <LegalLayout
    title="Privacy Policy"
    subtitle="Legal · Data Protection"
    effectiveDate="1 April 2025"
    icon={<Shield />}
    accentColor="from-blue-600 to-indigo-600"
    sections={SECTIONS}
  >
    <p className="text-sm text-gray-500 leading-relaxed mb-10 pb-6 border-b border-gray-100">
      This Privacy Policy describes how <strong className="text-gray-700">Sicswave FinCore</strong> collects, uses, stores, and
      protects personal and financial data processed through the Co-operative Banking Platform ("Platform"). The Platform is
      operated exclusively on behalf of licensed co-operative thrift and credit societies ("the Society"). By accessing or using
      the Platform, authorised operators acknowledge and accept the practices described below.
    </p>

    <LegalSection id="scope" number="1" title="Scope of This Policy">
      <p>
        This policy applies to all data entered into or processed by the Platform, including member records, account data,
        transaction records, and system access logs. It does not apply to third-party websites or services that may be linked
        from, or connected to, the Platform.
      </p>
    </LegalSection>

    <LegalSection id="data-collected" number="2" title="Data Collected">
      <p>The Platform collects and processes the following categories of data on behalf of the Society:</p>
      <LegalList items={[
        <><strong>Member identification data:</strong> full name, date of birth, gender, caste, occupation, relation details, and membership number.</>,
        <><strong>Contact and location data:</strong> address, village, post office, tehsil, phone number, and email address.</>,
        <><strong>Identity documents:</strong> Aadhaar card number and PAN card number (masked in display; stored as provided by the Society).</>,
        <><strong>Financial account data:</strong> saving account, recurring deposit, fixed deposit, loan account numbers, balances, interest rates, and maturity details.</>,
        <><strong>Transaction records:</strong> all deposits, withdrawals, loan disbursements, loan recoveries, interest postings, and related voucher entries.</>,
        <><strong>Operator access data:</strong> user credentials (passwords stored as hashed values), branch assignment, login timestamps, and session identifiers.</>,
        <><strong>System and audit data:</strong> action logs, error logs, and voucher verification records.</>,
      ]} />
    </LegalSection>

    <LegalSection id="purpose" number="3" title="Purpose of Data Processing">
      <p>Data is processed solely for the following purposes:</p>
      <LegalList items={[
        "Maintaining member and account records as required by the Society's operations.",
        "Recording, processing, and auditing financial transactions.",
        "Generating statutory and internal financial reports.",
        "Enforcing access controls and maintaining a verifiable audit trail.",
        "Complying with applicable legal and regulatory obligations applicable to co-operative societies.",
      ]} />
      <p className="mt-3">We do not use member or account data for marketing, profiling, or any purpose beyond the legitimate operational needs of the Society.</p>
    </LegalSection>

    <LegalSection id="controller" number="4" title="Data Controller and Processor Relationship">
      <p>
        The Society is the <strong>data controller</strong> — it determines the purposes and means of processing member data.
        Sicswave FinCore acts as a <strong>data processor</strong>, processing data only as instructed by the Society and only for
        the purposes stated above. Operators of the Platform act under the authority and responsibility of the Society.
      </p>
    </LegalSection>

    <LegalSection id="access" number="5" title="Data Access and Disclosure">
      <p>Access to data within the Platform is restricted to:</p>
      <LegalList items={[
        "Authorised operators assigned to the relevant branch by the Society.",
        "Super-user accounts with elevated administrative privileges, as designated by the Society.",
      ]} />
      <p className="mt-3">
        We do not sell, rent, or share member or transaction data with any third party for commercial purposes. Data may be
        disclosed only if required by a court order, statutory authority, or applicable law, and only to the extent required.
      </p>
    </LegalSection>

    <LegalSection id="retention" number="6" title="Data Retention">
      <p>
        Transaction records, account histories, and member data are retained for as long as the Society requires them to fulfil
        its statutory obligations and operational needs. Deleted or closed accounts are retained in audit logs as required for
        regulatory compliance. System error logs are retained for a minimum of 90 days.
      </p>
    </LegalSection>

    <LegalSection id="security" number="7" title="Data Security">
      <p>
        We implement technical and organisational measures to protect data against unauthorised access, loss, or disclosure.
        These include access controls, encrypted data transmission, session management, and account lockout policies. Details are
        described in our <strong>Security Policy</strong>.
      </p>
    </LegalSection>

    <LegalSection id="cookies" number="8" title="Cookies and Session Data">
      <p>
        The Platform uses session-bound authentication tokens to maintain a secure login session. These tokens are stored in
        browser memory and are invalidated on logout or session expiry. The Platform does not use tracking cookies, analytics
        cookies, or any third-party advertising cookies.
      </p>
    </LegalSection>

    <LegalSection id="rights" number="9" title="Rights and Requests">
      <p>
        Requests relating to the correction, access, or erasure of personal data should be directed to the Society. The Society
        is responsible for responding to such requests in accordance with applicable data protection law. Sicswave FinCore will
        support the Society in fulfilling verified requests as technically feasible.
      </p>
    </LegalSection>

    <LegalSection id="changes" number="10" title="Changes to This Policy">
      <p>
        We may update this policy to reflect changes in our practices or applicable law. Material changes will be communicated
        through the Platform's in-app notification system. Continued use of the Platform following such notification constitutes
        acceptance of the revised policy.
      </p>
    </LegalSection>

    <LegalSection id="contact" number="11" title="Contact">
      <p>
        For privacy-related queries concerning the Platform, contact:{" "}
        <a href="mailto:privacy@sicswave.com" className="text-blue-600 hover:underline font-medium">privacy@sicswave.com</a>
      </p>
    </LegalSection>
  </LegalLayout>
);

export default PrivacyPolicy;
