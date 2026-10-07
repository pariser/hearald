let target = "express";

export function initialize(data) {
  target = data.express;
}

export function resolve(specifier, context, nextResolve) {
  return nextResolve(specifier === "express" ? target : specifier, context);
}
