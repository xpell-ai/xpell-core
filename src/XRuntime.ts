let _x_ref: any;

export function setXRuntime(x: any) {
  _x_ref = x;
}

export function getXRuntime() {
  if (!_x_ref) {
    throw new Error("XRuntime not set");
  }
  return _x_ref;
}