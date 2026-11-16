export const roleEnum = Object.freeze({
  Customer: 0,
  Staff: 2,
  Admin: 3,
});

export const isKnownRole = (role) => Object.values(roleEnum).includes(role);
export const hasAnyRole = (role, allowedRoles) => allowedRoles.includes(role);
