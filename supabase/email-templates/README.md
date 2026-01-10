# Email Template Configuration

This directory contains HTML email templates for Supabase authentication emails.

## How to Update Email Templates in Supabase

Email templates are configured through the Supabase Dashboard, not in code. Follow these steps:

### 1. Access Email Templates

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/wcxtksnwtoyskctqkdqw
2. Navigate to **Authentication** → **Email Templates** in the left sidebar

### 2. Configure Confirmation Email

1. Select **Confirm signup** from the template list
2. Copy the contents of `confirm-signup.html` from this directory
3. Paste it into the **Email Template** editor
4. Click **Save** to apply the changes

### 3. Template Variables

Supabase provides the following variables that you can use in email templates:

- `{{ .ConfirmationURL }}` - The confirmation link for email verification
- `{{ .Token }}` - The confirmation token (if you want to build a custom URL)
- `{{ .TokenHash }}` - Hashed version of the token
- `{{ .SiteURL }}` - Your site URL (configured in Auth settings)
- `{{ .Email }}` - The user's email address

### 4. Test the Email

After saving:
1. Create a new test account on your application
2. Check your email inbox for the confirmation email
3. Verify the styling and links work correctly

### 5. Other Email Templates

You can customize other authentication emails in the same way:
- **Invite user** - When admins invite new users
- **Magic Link** - For passwordless login
- **Change Email Address** - When users update their email
- **Reset Password** - For password recovery

## Template Features

The `confirm-signup.html` template includes:
- ✅ Responsive design that works on all devices
- ✅ Elmseed branding with green color scheme
- ✅ Clear call-to-action button
- ✅ Fallback text link for email clients that don't support buttons
- ✅ Professional styling with proper spacing and typography
- ✅ Security notice for users who didn't request the email
- ✅ Information about what happens after confirmation

## Customization

To customize the template:
1. Edit `confirm-signup.html` in this directory
2. Update colors, text, or layout as needed
3. Copy the updated HTML to Supabase Dashboard
4. Test thoroughly before deploying to production

## Brand Colors Used

- Primary Green: `#1f6b3f`
- Secondary Green: `#2d8659`
- Text Primary: `#374151`
- Text Secondary: `#6b7280`
- Text Muted: `#9ca3af`
- Background: `#f5f5f5`
- White: `#ffffff`
