/**
 * Root-level Next.js config used by Turbopack to determine the project root
 * when multiple lockfiles exist. We point it at the actual app in ./preptalk.
 */

/** @type {import('next').NextConfig} */
const config = {
  turbopack: {
    root: "./preptalk",
  },
};

export default config;
