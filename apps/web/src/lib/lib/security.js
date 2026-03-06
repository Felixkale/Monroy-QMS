/**
 * Security utilities for input validation and sanitization
 */

// Email validation
export function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || email.length > 254) return false;
  return regex.test(email);
}

// Phone validation
export function validatePhone(phone) {
  const regex = /^[\d\s\-\+\(\)]{10,}$/;
  return regex.test(phone);
}

// Input sanitization - prevent XSS
export function sanitizeInput(input) {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

// File validation
export function validateFile(file, options = {}) {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'application/pdf'],
    minSize = 1024, // 1KB minimum
  } = options;

  if (!file) {
    throw new Error('No file provided');
  }

  // Check file size
  if (file.size < minSize) {
    throw new Error(`File must be at least ${minSize / 1024}KB`);
  }

  if (file.size > maxSize) {
    throw new Error(`File must be less than ${maxSize / (1024 * 1024)}MB`);
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
  }

  // Verify file extension matches MIME type
  const extension = file.name.split('.').pop().toLowerCase();
  const extensionMap = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
  };

  if (extensionMap[extension] !== file.type) {
    throw new Error('File extension does not match file type');
  }

  return true;
}

// Certificate number validation
export function validateCertificateNumber(certNumber) {
  const regex = /^CERT-\d{6}$/;
  return regex.test(certNumber);
}

// Inspection ID validation
export function validateInspectionID(id) {
  const regex = /^[A-Z0-9\-]{5,20}$/;
  return regex.test(id);
}

// SWL/MAWP validation (numeric with unit)
export function validateMeasurement(value) {
  const regex = /^[\d.]+\s?(TON|bar|kg|PSI|kPa)$/i;
  return regex.test(value);
}

// Rate limiting helper
export function checkRateLimit(key, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const userRequests = JSON.parse(localStorage.getItem(key) || '[]');
  
  // Remove old requests outside the window
  const recentRequests = userRequests.filter(time => now - time < windowMs);
  
  if (recentRequests.length >= maxRequests) {
    throw new Error('Too many requests. Please try again later.');
  }
  
  recentRequests.push(now);
  localStorage.setItem(key, JSON.stringify(recentRequests));
  
  return true;
}

// CSRF token generator
export function generateCSRFToken() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Verify CSRF token
export function verifyCSRFToken(token, storedToken) {
  if (!token || !storedToken) return false;
  return token === storedToken;
}
