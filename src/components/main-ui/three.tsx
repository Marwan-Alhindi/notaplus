// import React, { useEffect, useRef, useState } from 'react';
// import * as THREE from 'three';

// export default function Three() {
//     // Reference to the div where the canvas will be mounted
//     const mountRef = useRef(null);
//     const [cursor, setCursor] = useState({ x: 0, y: 0 }); // State to store mouse position

//     useEffect(() => {
//         // Scene setup
        
//         const scene = new THREE.Scene();

//         // Geometry and Material
//         const size = {
//             width: 400,
//             height: 400,
//             depth: 400
//         };
//         const geometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
//         const material = new THREE.MeshBasicMaterial({ color: 'red' });
//         const mesh = new THREE.Mesh(geometry, material);
//         scene.add(mesh);

//         // Camera setup
//         const camera = new THREE.PerspectiveCamera(
//             75,
//             size.width / size.height
//         );


//         // Renderer setup
//         const renderer = new THREE.WebGLRenderer();
//         renderer.setSize(size.width, size.height);

//         // Attach the renderer's canvas to the DOM
//         mountRef.current.appendChild(renderer.domElement);

//         // Animation loop with full rotation
//         const animate = () => {
//             const elapsedTime = performance.now() / 1000; // Use time for smoother animation
            
//             // Calculate camera's position based on cursor movement
//             camera.position.x = Math.sin(cursor.x * Math.PI * 2) * 800; // Full 360-degree rotation
//             camera.position.z = Math.cos(cursor.x * Math.PI * 2) * 800;
//             camera.position.y = -cursor.y * 1000; // Adjust height with y-axis movement
//             mesh.rotation.x = elapsedTime; // Rotate the mesh
                        
//             // Camera looks at the mesh
//             camera.lookAt(mesh.position);

//             // Render the scene
//             renderer.render(scene, camera);
//             requestAnimationFrame(animate);
//         };
//         animate();

//         // Cleanup on unmount
//         return () => {
//             mountRef.current.removeChild(renderer.domElement);
//         };
//     }, [cursor]); // Depend on cursor changes

//     // Mousemove event listener
//     useEffect(() => {
//         const handleMouseMove = (event) => {
//             // Normalize cursor position to a range of [-0.5, 0.5]
//             const { clientX, clientY } = event;
//             const rect = mountRef.current.getBoundingClientRect(); // Get the canvas bounds

//             const x = (clientX - rect.left) / rect.width - 0.5;
//             const y = (clientY - rect.top) / rect.height - 0.5;

//             setCursor({ x, y }); // Update state
//         };

//         window.addEventListener('mousemove', handleMouseMove);

//         return () => {
//             window.removeEventListener('mousemove', handleMouseMove);
//         };
//     }, [cursor]); // Empty dependency array to run only once

//     return (
//         <div>
//             <h1>Three.js in React</h1>
//             {/* Div to hold the Three.js canvas */}
//             <div ref={mountRef}></div>
//         </div>
//     );
// }