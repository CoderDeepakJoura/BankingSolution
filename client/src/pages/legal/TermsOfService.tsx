import React from "react";
import { FileText } from "lucide-react";
import LegalLayout, { LegalSection, LegalList } from "./LegalLayout";

const SECTIONS = [
  { id: "authorised-use", title: "Authorised Use Only" },
  { id: "operator-responsibilities", title: "Operator Responsibilities" },
  { id: "financial-integrity", title: "Financial Data Integrity" },
  { id: "confidentiality", title: "Confidentiality of Member Data" },
  { id: "acceptable-use", title: "Acceptable System Use" },
  { id: "ip", title: "Intellectual Property" },
  { id: "availability", title: "Service Availability" },
  { id: "liability", title: "Limitation of Liability" },
  { id: "termination", title: "Termination of Access" },
  { id: "governing-law", title: "Governing Law" },
  { id: "amendments", title: "Amendments" },
  { id: "contact", title: "Contact" },
];

const TermsOfService: React.FC = () => (
  <LegalLayout
    title="Terms of Service"
    subtitle="Legal · Usage Agreement"
    effectiveDate="1 April 2025"
    icon={<FileText />}
    accentColor="from-blue-600 to-indigo-600"
    sections={SECTIONS}
  >
    <p className="text-sm text-gray-500 leading-relaxed mb-10 pb-6 border-b border-gray-100">
      These Terms of Service ("Terms") govern access to and use of the Co-operative Banking Platform ("Platform") provided by{" "}
      <strong className="text-gray-700">Sicswave FinCore</strong> to co-operative thrift and credit societies ("the Society") and
      their authorised operators. By logging into or using the Platform, you agree to be bound by these Terms.
    </p>

    <LegalSection id="authorised-use" number="1" title="Authorised Use Only">
      <p>
        The Platform is a closed, operator-facing system. Access is granted exclusively to individuals who have been registered
        and authorised by the Society. Each login account is personal and non-transferable. You must not:
      </p>
      <LegalList items={[
        "Share your login credentials with any other person.",
        "Access the Platform using another operator's credentials.",
        "Attempt to access branches, accounts, or data outside your assigned authorisation level.",
        "Use the Platform for any purpose other than the Society's legitimate banking operations.",
      ]} />
    </LegalSection>

    <LegalSection id="operator-responsibilities" number="2" title="Operator Responsibilities">
      <p>
        All entries made through the Platform — including vouchers, account registrations, interest postings, and loan
        transactions — are the sole responsibility of the authorised operator making them. Operators are expected to:
      </p>
      <LegalList items={[
        "Verify the accuracy of all data entered before saving or submitting.",
        "Report discrepancies, errors, or suspected unauthorised entries to the Society's supervisor immediately.",
        "Log out of the Platform when leaving an unattended workstation.",
        "Not circumvent the maker-checker verification workflow where it is enabled.",
      ]} />
    </LegalSection>

    <LegalSection id="financial-integrity" number="3" title="Financial Data Integrity">
      <p>
        The Platform maintains a permanent, time-stamped audit trail of all financial transactions. Deletion or modification of
        posted vouchers is subject to system controls and supervisor authorisation. Operators must not:
      </p>
      <LegalList items={[
        "Delete, reverse, or modify vouchers without proper supervisory approval and a valid business reason.",
        "Enter fictitious, back-dated, or manually manipulated entries for the purpose of misrepresentation.",
        "Circumvent account-level or session-level date restrictions.",
      ]} />
      <p className="mt-3">
        Any financial irregularity discovered during or after entry must be reported through the Society's established internal
        controls and, where required, to the relevant statutory authority.
      </p>
    </LegalSection>

    <LegalSection id="confidentiality" number="4" title="Confidentiality of Member Data">
      <p>
        Member names, Aadhaar numbers, PAN card numbers, account balances, and transaction histories are confidential. Operators
        must not:
      </p>
      <LegalList items={[
        "Disclose member financial information to any person who is not authorised by the Society to receive it.",
        "Export, print, or share member data outside of authorised Society processes.",
        "Retain copies of member data on personal devices or external storage media.",
      ]} />
    </LegalSection>

    <LegalSection id="acceptable-use" number="5" title="Acceptable System Use">
      <p>The Platform may only be used on devices that meet the Society's operational security standards. You must not:</p>
      <LegalList items={[
        "Attempt to probe, scan, or test the Platform for security vulnerabilities without explicit written authorisation from Sicswave FinCore.",
        "Introduce malicious software, scripts, or automated tools that interact with the Platform in an unauthorised manner.",
        "Interfere with the integrity or availability of the Platform for other users.",
      ]} />
    </LegalSection>

    <LegalSection id="ip" number="6" title="Intellectual Property">
      <p>
        The Platform, including its design, source code, workflows, and documentation, is the proprietary property of Sicswave
        FinCore. The Society is granted a non-exclusive, non-transferable licence to use the Platform solely for its banking
        operations. No licence is granted to copy, reverse-engineer, distribute, or create derivative works from the Platform.
      </p>
    </LegalSection>

    <LegalSection id="availability" number="7" title="Service Availability">
      <p>
        We aim to maintain Platform availability during the Society's operational hours. However, we do not guarantee
        uninterrupted access. Planned maintenance windows will be communicated in advance where possible. We are not liable for
        transaction losses arising from temporary service unavailability outside our reasonable control.
      </p>
    </LegalSection>

    <LegalSection id="liability" number="8" title="Limitation of Liability">
      <p>
        To the extent permitted by law, Sicswave FinCore's liability for any claim arising from use of the Platform is limited
        to direct losses caused by our gross negligence or wilful misconduct. We are not liable for losses arising from:
      </p>
      <LegalList items={[
        "Operator error, including incorrect data entry or premature deletion of records.",
        "Unauthorised access resulting from an operator sharing or misusing credentials.",
        "System failures attributable to third-party infrastructure (network, hosting, database provider).",
      ]} />
    </LegalSection>

    <LegalSection id="termination" number="9" title="Termination of Access">
      <p>
        The Society may revoke any operator's access at any time. Sicswave FinCore reserves the right to suspend or terminate
        access to the Platform if a user is found to be in material breach of these Terms, or if required by law or regulatory
        directive. Termination does not affect the validity of records already entered.
      </p>
    </LegalSection>

    <LegalSection id="governing-law" number="10" title="Governing Law">
      <p>
        These Terms are governed by the laws of India. Any disputes arising from these Terms or the use of the Platform shall be
        subject to the exclusive jurisdiction of the courts of competent jurisdiction in India.
      </p>
    </LegalSection>

    <LegalSection id="amendments" number="11" title="Amendments">
      <p>
        We may amend these Terms from time to time. Amendments will be notified through the Platform. Continued use after the
        effective date of an amendment constitutes acceptance of the revised Terms.
      </p>
    </LegalSection>

    <LegalSection id="contact" number="12" title="Contact">
      <p>
        For queries regarding these Terms:{" "}
        <a href="mailto:legal@sicswave.com" className="text-blue-600 hover:underline font-medium">legal@sicswave.com</a>
      </p>
    </LegalSection>
  </LegalLayout>
);

export default TermsOfService;
