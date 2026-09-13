"""Generate the bundled sample .docx files (so the Word connector really parses .docx)."""
from pathlib import Path
from docx import Document

OUT = Path(__file__).resolve().parent / "worddocs"
OUT.mkdir(parents=True, exist_ok=True)

DOCS = [
    ("Onboarding_IT_Checklist.docx", "New Hire IT Onboarding Checklist", [
        ("Heading 1", "New Hire IT Onboarding Checklist"),
        ("Normal", "This checklist covers the IT setup every new employee must complete on day one."),
        ("Heading 2", "Accounts"),
        ("Normal", "Request SSO access via the IT portal. Enable MFA using the Okta Verify app before first login."),
        ("Heading 2", "Hardware"),
        ("Normal", "Collect your laptop from the IT desk. Full-disk encryption is enabled by default and must not be disabled."),
        ("Heading 2", "VPN"),
        ("Normal", "Install GlobalProtect and connect to vpn.acme.com using your SSO credentials before accessing internal tools."),
    ]),
    ("Data_Backup_Policy.docx", "Data Backup and Retention Policy", [
        ("Heading 1", "Data Backup and Retention Policy"),
        ("Normal", "All production databases are backed up nightly and retained for 30 days."),
        ("Heading 2", "Restore Procedure"),
        ("Normal", "To restore, open a P1 incident, then use the point-in-time restore runbook. Restores must be validated in staging before production cutover."),
        ("Heading 2", "Retention"),
        ("Normal", "Financial records are retained for 7 years. Personal data is deleted within 90 days of an approved erasure request."),
    ]),
]

for name, title, blocks in DOCS:
    d = Document()
    d.core_properties.title = title
    d.core_properties.author = "IT Documentation"
    for style, text in blocks:
        d.add_paragraph(text, style=style)
    d.save(str(OUT / name))
    print("wrote", OUT / name)
