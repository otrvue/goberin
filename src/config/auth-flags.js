const isEnabled = (value) => String(value).toLowerCase() === "true";

export const isDevVerificationBypassEnabled = () => {
    return isEnabled(process.env.SKIP_EMAIL_VERIFICATION) && isEnabled(process.env.SKIP_2FA_VERIFICATION);
};
