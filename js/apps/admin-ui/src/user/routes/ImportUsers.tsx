import { lazy } from "react";
import type { Path } from "react-router-dom";
import { generateEncodedPath } from "../../utils/generateEncodedPath";
import type { AppRouteObject } from "../../routes";

export type ImportUsersParams = { realm: string };

const ImportUsers = lazy(() => import("../ImportUsers"));

export const ImportUsersRoute: AppRouteObject = {
  path: "/:realm/users/import",
  element: <ImportUsers />,
  breadcrumb: (t) => t("importUsers"),
  handle: {
    access: ["query-users"], // Same permission as adding users
  },
};

export const toImportUsers = (params: ImportUsersParams): Partial<Path> => ({
  pathname: generateEncodedPath(ImportUsersRoute.path, params),
});
