import * as THREE from 'three';

/** Characters built from primitives — no external model pipeline (implementation.md §12). */
export interface Actor {
  group: THREE.Group;
  body: THREE.Mesh;
  materials: THREE.MeshStandardMaterial[];
}

export interface HeroActor extends Actor {
  weaponGroup: THREE.Group;
}

export function buildHero(): HeroActor {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x5b7fd6, metalness: 0.2, roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.6, 4, 8), bodyMat);
  body.position.y = 0.72;
  group.add(body);

  const headMat = new THREE.MeshStandardMaterial({ color: 0xe8c9a0, roughness: 0.6 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), headMat);
  head.position.y = 1.32;
  group.add(head);

  const weaponGroup = new THREE.Group();
  weaponGroup.position.set(0.32, 0.95, 0);
  group.add(weaponGroup);

  const weaponMat = new THREE.MeshStandardMaterial({ color: 0xcfd6e0, metalness: 0.7, roughness: 0.3 });
  const weapon = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), weaponMat);
  weapon.position.y = 0.35;
  weaponGroup.add(weapon);
  weaponGroup.rotation.z = -0.4;

  const auraMat = new THREE.MeshStandardMaterial({
    color: 0x5b7fd6,
    emissive: 0x5b7fd6,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.25,
  });
  const aura = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 6, 24), auraMat);
  aura.rotation.x = Math.PI / 2;
  aura.position.y = 0.05;
  group.add(aura);

  return { group, body, weaponGroup, materials: [bodyMat, headMat, weaponMat, auraMat] };
}

export interface EnemyActor extends Actor {
  hpBarFg: THREE.Mesh;
  hpBarBillboard: THREE.Group;
}

export function buildEnemy(isBoss: boolean, hue: number): EnemyActor {
  const group = new THREE.Group();
  const scale = isBoss ? 1.5 : 1;
  group.scale.setScalar(scale);

  const color = new THREE.Color().setHSL(hue, 0.55, isBoss ? 0.42 : 0.5);
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.5, 4, 8), bodyMat);
  body.position.y = 0.65;
  group.add(body);

  const hornMat = new THREE.MeshStandardMaterial({ color: 0x2a2320, roughness: 0.7 });
  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 6), hornMat);
    horn.position.set(side * 0.14, 1.15, 0);
    horn.rotation.z = side * 0.3;
    group.add(horn);
  }

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff4433, emissive: 0xff2200, emissiveIntensity: isBoss ? 1.4 : 0.8 });
  const eyes = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), eyeMat);
  eyes.position.set(0, 0.95, 0.24);
  group.add(eyes);

  const hpBarBillboard = new THREE.Group();
  hpBarBillboard.position.y = 1.5;
  group.add(hpBarBillboard);

  const barBgMat = new THREE.MeshBasicMaterial({ color: 0x1a1a22 });
  const hpBarBg = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.09), barBgMat);
  hpBarBillboard.add(hpBarBg);

  const barFgMat = new THREE.MeshBasicMaterial({ color: 0xd23c3c });
  const hpBarFg = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.07), barFgMat);
  hpBarFg.position.z = 0.001;
  hpBarBillboard.add(hpBarFg);

  return {
    group,
    body,
    materials: [bodyMat, hornMat, eyeMat],
    hpBarFg,
    hpBarBillboard,
  };
}
