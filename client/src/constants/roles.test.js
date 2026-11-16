import { hasAnyRole, isKnownRole, roleEnum } from "./roles";
import { routes } from "../layouts/components/SideBar/routes";

describe("role access constants", () => {
  test("matches the roles stored by the backend", () => {
    expect(roleEnum).toEqual({ Customer: 0, Staff: 2, Admin: 3 });
    expect([0, 2, 3].every(isKnownRole)).toBe(true);
    expect([1, 4, -1, null].some(isKnownRole)).toBe(false);
  });

  test("keeps customer, staff, and admin route access distinct", () => {
    expect(hasAnyRole(roleEnum.Customer, [roleEnum.Customer])).toBe(true);
    expect(hasAnyRole(roleEnum.Customer, [roleEnum.Staff, roleEnum.Admin])).toBe(false);
    expect(hasAnyRole(roleEnum.Staff, [roleEnum.Staff, roleEnum.Admin])).toBe(true);
    expect(hasAnyRole(roleEnum.Staff, [roleEnum.Admin])).toBe(false);
    expect(hasAnyRole(roleEnum.Admin, [roleEnum.Admin])).toBe(true);
  });

  test("limits the staff menu entry to admins", () => {
    const staffMenu = routes.find(route => route.path === "/admin/staff");
    expect(staffMenu.permissions).toEqual([roleEnum.Admin]);
  });
});
