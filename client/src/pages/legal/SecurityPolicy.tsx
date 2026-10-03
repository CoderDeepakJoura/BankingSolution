import React from "react";
import { Lock } from "lucide-react";
import LegalLayout, { LegalSection, LegalList } from "./LegalLayout";

const SECTIONS = [
  { id: "access-control", title: "Authentication and Access Control" },
  { id: "transmission", title: "Data Transmission Security" },
  { id: "maker-checker", title: "Maker-Checker Verification" },
  { id: "audit-trail", title: "Audit Trail" },
  { id: "data-storage", title: "Data Storage" },
  { id: "session-management", title: "Session Management" },
  { id: "inter-branch", title: "Inter-Branch Transaction Controls" },
  { id: "operator-security", title: "Operator Security Responsibilities" },
  { id: "disclosure", title: "Vulnerability Disclosure" },
  { id: "updates", title: "Updates to This Policy" },
  { id: "contact", title: "Contact" },
];

const SecurityPolicy: React.FC = () => (
  <LegalLayout
    title="Security"
    subtitle="Legal · Security Practices"
    effectiveDate="1 April 2025"
    icon={<Lock />}
    accentColor="from-blue-600 to-indigo-600"
    sections={SECTIONS}
  >
    <p className="text-sm text-gray-500 leading-relaxed mb-10 pb-6 border-b border-gray-100">
      This Security Policy describes the technical and organisational controls that{" "}
      <strong className="text-gray-700">Sicswave FinCore</strong> applies to protect the Co-operative Banking Platform
      ("Platform") and the financial data it processes on behalf of co-operative societies. This document is intended to inform
      authorised operators and the Society of the security practices in place.
    </p>

    <LegalSection id="access-control" number="1" title="Authentication and Access Control">
      <p>Access to the Platform is protected by the following controls:</p>
      <LegalList items={[
        <><strong>Credential-based login:</strong> Each operator authenticates with a unique username and password. Passwords are stored using a one-way cryptographic hash; plain-text passwords are never stored or transmitted.</>,
        <><strong>Short-lived access tokens:</strong> On successful authentication, the Platform issues a short-lived access token. This token expires automatically and must be renewed through a secure refresh mechanism.</>,
        <><strong>Account lockout:</strong> After a configurable number of consecutive failed login attempts, the operator's account is temporarily locked to prevent brute-force attacks. Lockout duration is enforced server-side.</>,
        <><strong>Single-session enforcement (configurable):</strong> The Society may configure the Platform to allow only one active session per operator at a time. A new login from a different device invalidates any prior session for that operator.</>,
        <><strong>Role-based access:</strong> Access to branch data, financial records, and administrative functions is governed by the operator's assigned role. Operators can only access data within their assigned branch and role scope.</>,
      ]} />
    </LegalSection>

    <LegalSection id="transmission" number="2" title="Data Transmission Security">
      <p>
        All communication between the Platform's browser-based interface and the server is transmitted exclusively over{" "}
        <strong>HTTPS using TLS</strong> (Transport Layer Security). Unencrypted HTTP connections to the Platform are not
        permitted. This protects member data, transaction records, and authentication tokens from interception in transit.
      </p>
    </LegalSection>

    <LegalSection id="maker-checker" number="3" title="Maker-Checker Verification">
      <p>Where enabled by the Society, the Platform enforces a <strong>maker-checker workflow</strong> for financial vouchers:</p>
      <LegalList items={[
        "An operator (maker) enters and saves a voucher, which is held in a pending state.",
        "A second authorised operator (checker) with verification rights reviews and approves the voucher before it takes financial effect.",
        "The maker and checker must be different operators; self-verification is not permitted.",
      ]} />
      <p className="mt-3">This control reduces the risk of errors and single-operator fraud in financial posting.</p>
    </LegalSection>

    <LegalSection id="audit-trail" number="4" title="Audit Trail">
      <p>The Platform maintains a tamper-evident, time-stamped audit log of all significant actions, including:</p>
      <LegalList items={[
        "Voucher creation, modification, and deletion, with the operator's identity and timestamp recorded.",
        "Voucher verification events, including the verifying operator's identity.",
        "Account opening, modification, and closure events.",
        "Day-begin and day-end operations.",
      ]} />
      <p className="mt-3">Audit records are retained and protected from routine operator access or deletion.</p>
    </LegalSection>

    <LegalSection id="data-storage" number="5" title="Data Storage">
      <p>
        Member records, account data, and transaction history are stored in a managed relational database. The database is
        hosted on infrastructure accessible only from authorised application servers; direct public access to the database is not
        permitted. Backups are performed regularly and retained securely.
      </p>
      <p className="mt-2">
        Sensitive identifiers such as Aadhaar numbers are stored as provided by the Society. The Society is responsible for
        ensuring it has lawful authority to store such identifiers under applicable Indian data protection and co-operative
        society regulations.
      </p>
    </LegalSection>

    <LegalSection id="session-management" number="6" title="Session Management">
      <p>Authenticated sessions are managed as follows:</p>
      <LegalList items={[
        "Sessions expire automatically after a period of inactivity.",
        "Logout invalidates the session token server-side, preventing reuse.",
        "Refresh tokens are rotated on each use; a compromised refresh token that has already been rotated is automatically rejected.",
      ]} />
    </LegalSection>

    <LegalSection id="inter-branch" number="7" title="Inter-Branch Transaction Controls">
      <p>
        For transactions involving member accounts across branches, the Platform enforces a multi-step approval workflow. Each
        step is recorded with the responsible operator's identity, branch, and timestamp. A completed inter-branch transaction
        requires confirmation at both the originating and receiving branches, with the head-office branch acting as an
        intermediary settlement step where applicable.
      </p>
    </LegalSection>

    <LegalSection id="operator-security" number="8" title="Operator Security Responsibilities">
      <p>Technical controls can only be effective when supported by operator behaviour. Operators are required to:</p>
      <LegalList items={[
        "Use a strong, unique password for the Platform and change it if they suspect it has been compromised.",
        "Never write passwords down or store them in an unprotected location.",
        "Log out of the Platform before leaving a workstation unattended.",
        "Not access the Platform from shared, public, or untrusted devices.",
        "Report any suspicious activity, unexpected account behaviour, or potential security incident to their branch supervisor immediately.",
      ]} />
    </LegalSection>

    <LegalSection id="disclosure" number="9" title="Vulnerability Disclosure">
      <p>
        If you believe you have identified a security vulnerability in the Platform, please report it to us responsibly at{" "}
        <a href="mailto:security@sicswave.com" className="text-blue-600 hover:underline font-medium">security@sicswave.com</a>{" "}
        before disclosing it publicly. Include a description of the issue, steps to reproduce it, and potential impact. We will
        acknowledge receipt within 3 business days and investigate promptly.
      </p>
      <p className="mt-2">
        We ask that you do not attempt to exploit any vulnerability, access data beyond what is necessary to demonstrate the
        issue, or disrupt Platform availability during your investigation.
      </p>
    </LegalSection>

    <LegalSection id="updates" number="10" title="Updates to This Policy">
      <p>
        This Security Policy is reviewed periodically and updated to reflect changes in controls, infrastructure, or applicable
        standards. Material updates will be communicated through the Platform.
      </p>
    </LegalSection>

    <LegalSection id="contact" number="11" title="Contact">
      <p>
        Security-related enquiries:{" "}
        <a href="mailto:security@sicswave.com" className="text-blue-600 hover:underline font-medium">security@sicswave.com</a>
      </p>
    </LegalSection>
  </LegalLayout>
);

export default SecurityPolicy;
