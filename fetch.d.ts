// TypeScript DOM and Next.js fetch typings helper
interface Body {
  json(): Promise<any>;
}

interface Response {
  json(): Promise<any>;
}
