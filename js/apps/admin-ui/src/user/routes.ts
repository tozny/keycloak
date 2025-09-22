import type { AppRouteObject } from "../routes";
import { AddUserRoute } from "./routes/AddUser";
import { ImportUsersRoute } from "./routes/ImportUsers";
import { UserRoute } from "./routes/User";
import { UsersRoute, UsersRouteWithTab } from "./routes/Users";

const routes: AppRouteObject[] = [
  AddUserRoute,
  ImportUsersRoute,
  UsersRoute,
  UsersRouteWithTab,
  UserRoute,
];

export default routes;
