# Enabling GitHub Code Scanning

This repository is configured with GitHub Code Scanning to detect security vulnerabilities and code quality issues.

## What is Configured

The repository includes the following security scanning workflows:

1. **CodeQL Analysis** (`.github/workflows/codeql.yml`)
   - Performs static code analysis on JavaScript/TypeScript code
   - Runs on push to main, pull requests, and weekly schedule
   - Automatically detects security vulnerabilities and code quality issues

2. **Gitleaks Secret Scanning** (`.github/workflows/gitleaks.yml`)
   - Scans for accidentally committed secrets and credentials
   - Runs on push to main and pull requests
   - Uploads findings to GitHub Code Scanning

## How to Enable Code Scanning in Repository Settings

GitHub Code Scanning is automatically enabled when you have workflows that use CodeQL or upload SARIF results. However, you may want to verify or configure additional settings:

### Step 1: Navigate to Security Settings

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. In the left sidebar, under "Security", click **Code security and analysis**

### Step 2: Enable Code Scanning (if not already enabled)

The presence of the CodeQL workflow (`.github/workflows/codeql.yml`) will automatically enable Code Scanning when it runs for the first time. You don't need to manually enable it in most cases.

However, you can verify it's enabled:

1. In the "Code security and analysis" section, look for **Code scanning**
2. If it shows "Set up" button, the workflows will enable it automatically on first run
3. Once enabled, you'll see "CodeQL analysis" listed as active

### Step 3: View Code Scanning Alerts

1. Go to the **Security** tab in your repository
2. Click on **Code scanning** in the left sidebar
3. You'll see all alerts from CodeQL and Gitleaks scans
4. Alerts can be filtered by tool, severity, and status

## What Happens Automatically

Once the workflows run:

- **On every push to main**: CodeQL analysis and Gitleaks scan run automatically
- **On every pull request**: Both scans run to catch issues before merging
- **Weekly**: CodeQL runs on a schedule to catch newly discovered vulnerabilities
- **Results**: All findings are uploaded to GitHub Security tab under Code Scanning

## Configuration Files

- `.github/workflows/codeql.yml` - CodeQL analysis workflow
- `.github/workflows/gitleaks.yml` - Gitleaks secret scanning workflow
- `.gitleaks.toml` - Gitleaks configuration with allowlist rules

## Viewing Results

### Code Scanning Alerts
- Navigate to **Security** → **Code scanning**
- View all alerts detected by CodeQL and Gitleaks
- Click on any alert to see details, affected code, and remediation guidance

### In Pull Requests
- Code scanning results appear as checks in pull requests
- New alerts introduced by the PR will be highlighted
- PRs can be blocked if high-severity alerts are detected (configurable in branch protection)

## Troubleshooting

### "Code scanning is not enabled" Error

If you see this error, it means:
1. The workflows haven't run yet - trigger them by creating a push or PR
2. The repository doesn't have Actions enabled - check repository settings
3. Advanced Security is required (for private repos in organizations)

### Workflows Not Running

Check:
1. GitHub Actions is enabled: Settings → Actions → General
2. Workflow permissions: Settings → Actions → General → Workflow permissions
3. Required permissions are set correctly in workflow files

### Private Repository Requirements

For **private repositories in GitHub organizations**, you need:
- GitHub Advanced Security license
- Advanced Security enabled in repository settings
- Contact your organization admin if you don't have access

### Public Repositories

For **public repositories**:
- Code scanning is free and automatically available
- No additional licenses required
- Workflows will run automatically once merged to main branch

## Additional Resources

- [GitHub Code Scanning Documentation](https://docs.github.com/en/code-security/code-scanning)
- [CodeQL Documentation](https://codeql.github.com/)
- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
