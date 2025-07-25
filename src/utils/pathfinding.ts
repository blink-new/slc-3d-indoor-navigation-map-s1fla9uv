// Pathfinding utilities for 3D navigation

export interface PathNode {
  id: string
  position: [number, number, number]
  floor: number
  type: 'room' | 'hallway' | 'stairs' | 'elevator' | 'entrance'
  connections: string[]
}

export interface PathStep {
  from: string
  to: string
  direction: string
  distance: number
  instruction: string
  floor: number
  floorChange?: 'up' | 'down'
}

// Navigation graph for St. Lawrence College
export const navigationNodes: Record<string, PathNode> = {
  'ENTRANCE': {
    id: 'ENTRANCE',
    position: [0, 1, -4],
    floor: 1,
    type: 'entrance',
    connections: ['HALL1_1', 'HALL1_2']
  },
  'HALL1_1': {
    id: 'HALL1_1',
    position: [0, 1, -2],
    floor: 1,
    type: 'hallway',
    connections: ['ENTRANCE', 'HALL1_2', 'B101', 'STAIRS1']
  },
  'HALL1_2': {
    id: 'HALL1_2',
    position: [2, 1, 0],
    floor: 1,
    type: 'hallway',
    connections: ['HALL1_1', '11840', 'CAFE', 'ELEVATOR1']
  },
  'STAIRS1': {
    id: 'STAIRS1',
    position: [-1, 1, -1],
    floor: 1,
    type: 'stairs',
    connections: ['HALL1_1', 'STAIRS2']
  },
  'ELEVATOR1': {
    id: 'ELEVATOR1',
    position: [3, 1, -1],
    floor: 1,
    type: 'elevator',
    connections: ['HALL1_2', 'ELEVATOR2']
  },
  'B101': {
    id: 'B101',
    position: [0, 1, -2],
    floor: 1,
    type: 'room',
    connections: ['HALL1_1']
  },
  '11840': {
    id: '11840',
    position: [-2, 1, 2],
    floor: 1,
    type: 'room',
    connections: ['HALL1_2']
  },
  'CAFE': {
    id: 'CAFE',
    position: [3, 1, 0],
    floor: 1,
    type: 'room',
    connections: ['HALL1_2']
  },
  // Floor 2
  'STAIRS2': {
    id: 'STAIRS2',
    position: [-1, 2, -1],
    floor: 2,
    type: 'stairs',
    connections: ['STAIRS1', 'HALL2_1']
  },
  'ELEVATOR2': {
    id: 'ELEVATOR2',
    position: [3, 2, -1],
    floor: 2,
    type: 'elevator',
    connections: ['ELEVATOR1', 'HALL2_2']
  },
  'HALL2_1': {
    id: 'HALL2_1',
    position: [0, 2, 0],
    floor: 2,
    type: 'hallway',
    connections: ['STAIRS2', 'HALL2_2', 'A233', 'C205']
  },
  'HALL2_2': {
    id: 'HALL2_2',
    position: [2, 2, 1],
    floor: 2,
    type: 'hallway',
    connections: ['HALL2_1', 'ELEVATOR2', 'LIB']
  },
  'A233': {
    id: 'A233',
    position: [2, 2, 0],
    floor: 2,
    type: 'room',
    connections: ['HALL2_1']
  },
  'C205': {
    id: 'C205',
    position: [-1, 2, 1],
    floor: 2,
    type: 'room',
    connections: ['HALL2_1']
  },
  'LIB': {
    id: 'LIB',
    position: [0, 2, 3],
    floor: 2,
    type: 'room',
    connections: ['HALL2_2']
  }
}

// Calculate distance between two 3D points
function calculateDistance(pos1: [number, number, number], pos2: [number, number, number]): number {
  const [x1, y1, z1] = pos1
  const [x2, y2, z2] = pos2
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2)
}

// Get direction between two points
function getDirection(from: [number, number, number], to: [number, number, number]): string {
  const [x1, , z1] = from
  const [x2, , z2] = to
  
  const dx = x2 - x1
  const dz = z2 - z1
  
  const angle = Math.atan2(dz, dx) * 180 / Math.PI
  
  if (angle >= -22.5 && angle < 22.5) return 'east'
  if (angle >= 22.5 && angle < 67.5) return 'northeast'
  if (angle >= 67.5 && angle < 112.5) return 'north'
  if (angle >= 112.5 && angle < 157.5) return 'northwest'
  if (angle >= 157.5 || angle < -157.5) return 'west'
  if (angle >= -157.5 && angle < -112.5) return 'southwest'
  if (angle >= -112.5 && angle < -67.5) return 'south'
  if (angle >= -67.5 && angle < -22.5) return 'southeast'
  
  return 'forward'
}

// Dijkstra's algorithm for pathfinding
export function findPath(startId: string, endId: string): PathStep[] {
  const distances: Record<string, number> = {}
  const previous: Record<string, string | null> = {}
  const unvisited = new Set(Object.keys(navigationNodes))
  
  // Initialize distances
  for (const nodeId of Object.keys(navigationNodes)) {
    distances[nodeId] = nodeId === startId ? 0 : Infinity
    previous[nodeId] = null
  }
  
  while (unvisited.size > 0) {
    // Find unvisited node with minimum distance
    let currentNode = null
    let minDistance = Infinity
    
    for (const nodeId of unvisited) {
      if (distances[nodeId] < minDistance) {
        minDistance = distances[nodeId]
        currentNode = nodeId
      }
    }
    
    if (!currentNode || distances[currentNode] === Infinity) break
    
    unvisited.delete(currentNode)
    
    // Check if we reached the destination
    if (currentNode === endId) break
    
    // Update distances to neighbors
    const node = navigationNodes[currentNode]
    for (const neighborId of node.connections) {
      if (!unvisited.has(neighborId)) continue
      
      const neighbor = navigationNodes[neighborId]
      const distance = calculateDistance(node.position, neighbor.position)
      const newDistance = distances[currentNode] + distance
      
      if (newDistance < distances[neighborId]) {
        distances[neighborId] = newDistance
        previous[neighborId] = currentNode
      }
    }
  }
  
  // Reconstruct path
  const path: string[] = []
  let current = endId
  
  while (current !== null) {
    path.unshift(current)
    current = previous[current]
  }
  
  // Convert path to steps with instructions
  const steps: PathStep[] = []
  
  for (let i = 0; i < path.length - 1; i++) {
    const fromNode = navigationNodes[path[i]]
    const toNode = navigationNodes[path[i + 1]]
    
    const direction = getDirection(fromNode.position, toNode.position)
    const distance = calculateDistance(fromNode.position, toNode.position)
    
    let instruction = ''
    let floorChange: 'up' | 'down' | undefined
    
    if (toNode.type === 'stairs') {
      if (toNode.floor > fromNode.floor) {
        instruction = `Take the stairs up to floor ${toNode.floor}`
        floorChange = 'up'
      } else {
        instruction = `Take the stairs down to floor ${toNode.floor}`
        floorChange = 'down'
      }
    } else if (toNode.type === 'elevator') {
      if (toNode.floor > fromNode.floor) {
        instruction = `Take the elevator up to floor ${toNode.floor}`
        floorChange = 'up'
      } else if (toNode.floor < fromNode.floor) {
        instruction = `Take the elevator down to floor ${toNode.floor}`
        floorChange = 'down'
      } else {
        instruction = 'Continue to the elevator'
      }
    } else if (toNode.type === 'room') {
      instruction = `Arrive at ${toNode.id}`
    } else if (toNode.type === 'hallway') {
      instruction = `Continue ${direction} down the hallway`
    } else {
      instruction = `Head ${direction}`
    }
    
    steps.push({
      from: fromNode.id,
      to: toNode.id,
      direction,
      distance: Math.round(distance * 10) / 10,
      instruction,
      floor: toNode.floor,
      floorChange
    })
  }
  
  return steps
}

// Get all path nodes for visualization
export function getPathNodes(steps: PathStep[]): string[] {
  const nodes = new Set<string>()
  
  for (const step of steps) {
    nodes.add(step.from)
    nodes.add(step.to)
  }
  
  return Array.from(nodes)
}