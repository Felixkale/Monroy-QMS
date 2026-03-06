// ✅ Input validation
export function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// ✅ XSS prevention
export function sanitizeInput(input) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ✅ File validation
export function validateFile(file, maxSize = 2 * 1024 * 1024) {
  const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'application/pdf'];
  
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type');
  }
  
  if (file.size > maxSize) {
    throw new Error('File too large');
  }
  
  return true;
}
