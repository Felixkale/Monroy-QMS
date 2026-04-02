async function handleResendConfirmation(email) {
  setError("");
  setSuccess("");

  try {
    const res = await fetch("/api/admin/resend-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || "Failed to resend invitation.");
    }

    setSuccess(`Invitation email resent to ${email}.`);
  } catch (err) {
    setError(err.message);
  }
}
