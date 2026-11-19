import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AppRoutes } from "../App";
import { MeProvider } from "../lib/me";

/** Renders the whole app at `path`, with the same providers as App. Use stubApi for fetch. */
export function renderApp(path: string) {
  return render(
    <MeProvider>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </MeProvider>,
  );
}
