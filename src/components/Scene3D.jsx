import { lazy, Suspense } from 'react';

// three.js is ~500 kB – load it only when a hero actually renders a scene.
const Canvas = lazy(() => import('./Scene3DCanvas'));

export default function Scene3D(props) {
  return <Suspense fallback={null}><Canvas {...props} /></Suspense>;
}
