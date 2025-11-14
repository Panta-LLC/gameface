# Authentication Features

## Overview

This document provides an overview of the authentication features implemented in the identity service. It includes details about the available endpoints, their functionality, and the security measures in place.

---

## Endpoints

### 1. User Login

**Route**: `/login`

**Description**: Handles user login requests with rate limiting to prevent brute force attacks.

**Middleware**: `loginRateLimiter`

- Limits requests to 5 per 15 minutes per IP.

**Logic**:

- Validates email and password.
- Returns a fake JWT token for successful authentication.

**Response**:

- **200**: Login successful.
- **401**: Invalid credentials.

---

### 2. Social Login

**Route**: `/social-login`

**Description**: Handles social login requests.

**Logic**:

- Placeholder implementation for social login.

**Response**:

- **200**: Social login successful.

---

### 3. Token Refresh

**Route**: `/refresh-token`

**Description**: Handles token refresh requests.

**Logic**:

- Placeholder implementation for refreshing tokens.

**Response**:

- **200**: Token refreshed successfully.

---

## Security Measures

1. **Rate Limiting**:
   - Applied to the `/login` endpoint to enhance security.
   - Prevents brute force attacks by limiting the number of login attempts per IP.

2. **Generic Error Messages**:
   - Ensures that error messages do not reveal sensitive information.

---

## Future Enhancements

- Implement lockout mechanisms for repeated failed login attempts.
- Add audit trails for login activities.
- Enhance token management for multi-device support and revocation strategies.
