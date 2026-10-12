import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeHero() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 520;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 32);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Create double helix / connected medical data particle network
    const helixGroup = new THREE.Group();
    scene.add(helixGroup);

    const numPoints = 80;
    const radius = 5.5;
    const heightSpan = 26;
    const connPos = [];

    for (let i = 0; i < numPoints; i++) {
      const t = (i / numPoints) * Math.PI * 4;
      const y = (i / numPoints - 0.5) * heightSpan;
      const x1 = Math.cos(t) * radius;
      const z1 = Math.sin(t) * radius;
      const x2 = Math.cos(t + Math.PI) * radius;
      const z2 = Math.sin(t + Math.PI) * radius;

      if (i % 3 === 0) {
        connPos.push(x1, y, z1, x2, y, z2);
      }
    }

    const sphereGeo = new THREE.SphereGeometry(0.24, 12, 12);
    const matCyan = new THREE.MeshPhongMaterial({ color: 0x00d2ff, emissive: 0x005588, shininess: 80 });
    const matBlue = new THREE.MeshPhongMaterial({ color: 0x0066ff, emissive: 0x002266, shininess: 80 });

    for (let i = 0; i < numPoints; i++) {
      const t = (i / numPoints) * Math.PI * 4;
      const y = (i / numPoints - 0.5) * heightSpan;

      const node1 = new THREE.Mesh(sphereGeo, matCyan);
      node1.position.set(Math.cos(t) * radius, y, Math.sin(t) * radius);
      helixGroup.add(node1);

      const node2 = new THREE.Mesh(sphereGeo, matBlue);
      node2.position.set(Math.cos(t + Math.PI) * radius, y, Math.sin(t + Math.PI) * radius);
      helixGroup.add(node2);
    }

    const connMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 });
    const connLines = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(connPos, 3)),
      connMat
    );
    helixGroup.add(connLines);

    // Ambient data particles
    const particleCount = 140;
    const particleGeo = new THREE.BufferGeometry();
    const particleCoords = [];
    for (let p = 0; p < particleCount; p++) {
      particleCoords.push(
        (Math.random() - 0.5) * 35,
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 20
      );
    }
    particleGeo.setAttribute('position', new THREE.Float32BufferAttribute(particleCoords, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x60a5fa,
      size: 0.28,
      transparent: true,
      opacity: 0.6
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00d2ff, 2.5, 50);
    pointLight1.position.set(10, 15, 15);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x0066ff, 2, 50);
    pointLight2.position.set(-10, -10, 10);
    scene.add(pointLight2);

    helixGroup.rotation.z = 0.25;
    helixGroup.rotation.x = 0.15;

    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 0.4;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 0.4;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || window.innerWidth;
      const newH = container.clientHeight || 520;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    let animationFrameId;
    function animate() {
      animationFrameId = requestAnimationFrame(animate);
      helixGroup.rotation.y += 0.008;
      particles.rotation.y += 0.002;

      camera.position.x += (mouseX * 5 - camera.position.x) * 0.05;
      camera.position.y += (-mouseY * 5 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[520px] rounded-xl overflow-hidden bg-surface-container-lowest/40 flex items-center justify-center">
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
