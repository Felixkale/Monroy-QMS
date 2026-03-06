
import { supabase } from "./supabaseClient";

/**
 * Log user actions for security auditing
 */
export async function logAction({
  action,
  entityType,
  entityId,
  changes,
  userId,
}) {
  try {
    const { error } = await supabase.from('audit_log').insert([{
      actor_id: userId,
      action: action.toUpperCase(), // CREATE, UPDATE, DELETE, LOGIN, etc
      entity_type: entityType,
      entity_id: entityId,
      changes: changes || {},
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      ip_address: null, // Must be set server-side for security
      created_at: new Date().toISOString(),
    }]);

    if (error) {
      console.error("Audit log error:", error);
    }
  } catch (error) {
    console.error("Failed to log action:", error);
  }
}

/**
 * Log login attempts
 */
export async function logLoginAttempt(email, success, reason = null) {
  try {
    await supabase.from('audit_log').insert([{
      action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
      entity_type: 'user',
      changes: { email, reason },
      created_at: new Date().toISOString(),
    }]);
  } catch (error) {
    console.error("Failed to log login:", error);
  }
}

/**
 * Log suspicious activity
 */
export async function logSecurityEvent(eventType, details, userId = null) {
  try {
    await supabase.from('audit_log').insert([{
      actor_id: userId,
      action: eventType, // SUSPICIOUS_LOGIN, RATE_LIMIT_EXCEEDED, etc
      entity_type: 'security',
      changes: details,
      created_at: new Date().toISOString(),
    }]);
  } catch (error) {
    console.error("Failed to log security event:", error);
  }
}
