import { HeadContent, Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { AppToaster } from "@/components/app-toaster";
import { GameProvider } from "@/components/game-provider";
import Header from "@/components/header";
import { PersistenceNotice } from "@/components/persistence-notice";
import { PwaUpdate } from "@/components/pwa-update";
import { ThemeProvider } from "@/components/theme-provider";

import "../index.css";

const RouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-router-devtools").then(({ TanStackRouterDevtools }) => ({
        default: TanStackRouterDevtools,
      })),
    )
  : null;

export interface RouterAppContext {}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "Tic Tac Chor",
      },
      {
        name: "description",
        content:
          "Can you beat the non-biological tic-tac-chor?",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
  }),
});

function RootComponent() {
  return (
    <>
      <HeadContent />
      <a className="skip-link" href="#game-main">
        Skip to game
      </a>
      <GameProvider>
        <ThemeProvider>
          <div className="app-shell">
            <div>
              <Header />
              <PersistenceNotice />
              <PwaUpdate />
            </div>
            <Outlet />
          </div>
          <AppToaster />
        </ThemeProvider>
      </GameProvider>
      {RouterDevtools !== null ? (
        <Suspense fallback={null}>
          <RouterDevtools position="bottom-left" />
        </Suspense>
      ) : null}
    </>
  );
}
