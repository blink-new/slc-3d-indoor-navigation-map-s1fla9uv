import React, { useState, useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Box, Line } from '@react-three/drei'
import { Search, Navigation, MapPin, Layers, ArrowRight, Clock, Route } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { findPath, getPathNodes, navigationNodes, PathStep } from '../utils/pathfinding'
import { AROverlay } from './AROverlay'
import * as THREE from 'three'

// Sample room data for St. Lawrence College
const rooms = [
  { id: 'A233', name: 'Computer Lab A233', floor: 2, position: [2, 2, 0], type: 'lab' },
  { id: '11840', name: 'Lecture Hall 11840', floor: 1, position: [-2, 1, 2], type: 'classroom' },
  { id: 'B101', name: 'Biology Lab B101', floor: 1, position: [0, 1, -2], type: 'lab' },
  { id: 'C205', name: 'Chemistry Lab C205', floor: 2, position: [-1, 2, 1], type: 'lab' },
  { id: 'CAFE', name: 'Cafeteria', floor: 1, position: [3, 1, 0], type: 'dining' },
  { id: 'LIB', name: 'Library', floor: 2, position: [0, 2, 3], type: 'library' }
]

// Animated path line component
function PathLine({ points, animated = true }: { points: THREE.Vector3[], animated?: boolean }) {
  const lineRef = useRef<any>()
  const [progress, setProgress] = useState(0)
  
  useFrame((state) => {
    if (animated && lineRef.current) {
      const time = state.clock.elapsedTime
      setProgress((Math.sin(time * 2) + 1) / 2)
    }
  })
  
  if (points.length < 2) return null
  
  const visiblePoints = animated 
    ? points.slice(0, Math.max(2, Math.floor(points.length * progress)))
    : points
  
  return (
    <Line
      ref={lineRef}
      points={visiblePoints}
      color="#3b82f6"
      lineWidth={4}
      dashed={false}
    />
  )
}

// 3D Room component
function Room({ room, isDestination, isOnPath }: { room: any, isDestination: boolean, isOnPath: boolean }) {
  const meshRef = useRef<any>()
  
  useFrame((state) => {
    if (isDestination && meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime
    }
  })

  const color = isDestination ? '#3b82f6' : isOnPath ? '#10b981' : '#64748b'
  
  return (
    <group position={room.position}>
      <Box ref={meshRef} args={[0.8, 0.3, 0.8]} position={[0, 0.15, 0]}>
        <meshStandardMaterial color={color} />
      </Box>
      <Text
        position={[0, 0.5, 0]}
        fontSize={0.1}
        color="#1e293b"
        anchorX="center"
        anchorY="middle"
      >
        {room.id}
      </Text>
    </group>
  )
}

// Navigation node component (hallways, stairs, elevators)
function NavNode({ node, isOnPath }: { node: any, isOnPath: boolean }) {
  const meshRef = useRef<any>()
  
  useFrame((state) => {
    if (isOnPath && meshRef.current) {
      meshRef.current.material.opacity = 0.7 + Math.sin(state.clock.elapsedTime * 3) * 0.3
    }
  })
  
  let color = '#94a3b8'
  let size: [number, number, number] = [0.3, 0.1, 0.3]
  
  if (node.type === 'stairs') {
    color = '#f59e0b'
    size = [0.4, 0.2, 0.4]
  } else if (node.type === 'elevator') {
    color = '#8b5cf6'
    size = [0.4, 0.3, 0.4]
  } else if (node.type === 'entrance') {
    color = '#ef4444'
    size = [0.5, 0.2, 0.5]
  }
  
  if (isOnPath) {
    color = '#10b981'
  }
  
  return (
    <group position={node.position}>
      <Box ref={meshRef} args={size} position={[0, size[1] / 2, 0]}>
        <meshStandardMaterial 
          color={color} 
          transparent={isOnPath}
          opacity={isOnPath ? 0.8 : 1}
        />
      </Box>
      {node.type !== 'hallway' && (
        <Text
          position={[0, size[1] + 0.2, 0]}
          fontSize={0.08}
          color="#1e293b"
          anchorX="center"
          anchorY="middle"
        >
          {node.type.toUpperCase()}
        </Text>
      )}
    </group>
  )
}

// 3D Floor component
function Floor({ level, rooms, destination, currentFloor, pathNodes }: { 
  level: number, 
  rooms: any[], 
  destination: string | null, 
  currentFloor: number,
  pathNodes: string[]
}) {
  const floorRooms = rooms.filter(room => room.floor === level)
  const floorNavNodes = Object.values(navigationNodes).filter(node => node.floor === level)
  const opacity = level === currentFloor ? 1 : 0.3
  
  return (
    <group position={[0, level * 3, 0]} visible={Math.abs(level - currentFloor) <= 1}>
      {/* Floor plane */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#f1f5f9" transparent opacity={opacity} />
      </mesh>
      
      {/* Rooms */}
      {floorRooms.map(room => (
        <Room
          key={room.id}
          room={room}
          isDestination={room.id === destination}
          isOnPath={pathNodes.includes(room.id)}
        />
      ))}
      
      {/* Navigation nodes */}
      {floorNavNodes.map(node => (
        <NavNode
          key={node.id}
          node={node}
          isOnPath={pathNodes.includes(node.id)}
        />
      ))}
      
      {/* Floor label */}
      <Text
        position={[-4, 0.1, -4]}
        fontSize={0.3}
        color="#475569"
        anchorX="left"
        anchorY="middle"
      >
        Floor {level}
      </Text>
    </group>
  )
}

// 3D Scene component
function Scene3D({ destination, currentFloor, pathSteps }: { 
  destination: string | null, 
  currentFloor: number,
  pathSteps: PathStep[]
}) {
  const pathNodes = getPathNodes(pathSteps)
  
  // Create path line points
  const pathPoints = pathSteps.map(step => {
    const node = navigationNodes[step.to]
    return new THREE.Vector3(node.position[0], node.position[1], node.position[2])
  })
  
  if (pathSteps.length > 0) {
    const startNode = navigationNodes[pathSteps[0].from]
    pathPoints.unshift(new THREE.Vector3(startNode.position[0], startNode.position[1], startNode.position[2]))
  }
  
  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      
      {/* Animated path line */}
      {pathPoints.length > 1 && (
        <PathLine points={pathPoints} animated={true} />
      )}
      
      {[1, 2, 3].map(floor => (
        <Floor
          key={floor}
          level={floor}
          rooms={rooms}
          destination={destination}
          currentFloor={currentFloor}
          pathNodes={pathNodes}
        />
      ))}
      
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxPolarAngle={Math.PI / 2}
        minDistance={5}
        maxDistance={20}
      />
    </>
  )
}

// Directions panel component
function DirectionsPanel({ pathSteps, currentStep }: { pathSteps: PathStep[], currentStep: number }) {
  if (pathSteps.length === 0) return null
  
  const totalDistance = pathSteps.reduce((sum, step) => sum + step.distance, 0)
  const estimatedTime = Math.ceil(totalDistance * 0.5) // Rough estimate: 0.5 min per unit
  
  return (
    <Card className="bg-white/95 backdrop-blur-sm border-slate-200 max-h-80 overflow-y-auto">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Route className="h-5 w-5 text-blue-600" />
          <span>Turn-by-Turn Directions</span>
        </CardTitle>
        <div className="flex items-center space-x-4 text-sm text-slate-600">
          <div className="flex items-center space-x-1">
            <MapPin className="h-4 w-4" />
            <span>{totalDistance.toFixed(1)} units</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>~{estimatedTime} min</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {pathSteps.map((step, index) => (
          <div
            key={index}
            className={`flex items-start space-x-3 p-2 rounded-md transition-colors ${
              index === currentStep ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex-shrink-0 mt-1">
              {index === currentStep ? (
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              ) : (
                <div className="w-2 h-2 bg-slate-300 rounded-full" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900">
                {step.instruction}
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  Floor {step.floor}
                </Badge>
                {step.floorChange && (
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${
                      step.floorChange === 'up' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                    }`}
                  >
                    {step.floorChange === 'up' ? '↑' : '↓'} Floor Change
                  </Badge>
                )}
                <span className="text-xs text-slate-500">
                  {step.distance.toFixed(1)} units
                </span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default function Navigation3D() {
  const [searchQuery, setSearchQuery] = useState('')
  const [destination, setDestination] = useState<string | null>(null)
  const [currentFloor, setCurrentFloor] = useState(1)
  const [filteredRooms, setFilteredRooms] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [pathSteps, setPathSteps] = useState<PathStep[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [showDirections, setShowDirections] = useState(false)
  const [isARActive, setIsARActive] = useState(false)

  useEffect(() => {
    if (searchQuery) {
      const filtered = rooms.filter(room =>
        room.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredRooms(filtered)
      setShowSuggestions(true)
    } else {
      setFilteredRooms([])
      setShowSuggestions(false)
    }
  }, [searchQuery])

  const handleRoomSelect = (room: any) => {
    setDestination(room.id)
    setCurrentFloor(room.floor)
    setSearchQuery(room.id)
    setShowSuggestions(false)
    
    // Calculate path from entrance to destination
    const steps = findPath('ENTRANCE', room.id)
    setPathSteps(steps)
    setCurrentStep(0)
    setShowDirections(true)
  }

  const clearDestination = () => {
    setDestination(null)
    setSearchQuery('')
    setCurrentFloor(1)
    setPathSteps([])
    setCurrentStep(0)
    setShowDirections(false)
  }

  const nextStep = () => {
    if (currentStep < pathSteps.length - 1) {
      setCurrentStep(currentStep + 1)
      const nextStepData = pathSteps[currentStep + 1]
      setCurrentFloor(nextStepData.floor)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      const prevStepData = pathSteps[currentStep - 1]
      setCurrentFloor(prevStepData.floor)
    }
  }

  const toggleAR = () => {
    setIsARActive(!isARActive)
  }

  // Convert pathSteps to AR-compatible directions
  const arDirections = pathSteps.map(step => ({
    instruction: step.instruction,
    distance: step.distance,
    direction: step.floorChange === 'up' ? 'up' as const : 
              step.floorChange === 'down' ? 'down' as const :
              step.instruction.toLowerCase().includes('left') ? 'left' as const :
              step.instruction.toLowerCase().includes('right') ? 'right' as const :
              'straight' as const,
    floor: step.floor
  }))

  return (
    <div className="h-screen w-full bg-slate-50 relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/90 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Navigation className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-slate-900">St. Lawrence College</h1>
                <p className="text-sm text-slate-600">3D Indoor Navigation</p>
              </div>
            </div>
            
            {/* Floor Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">Floor:</span>
              {[1, 2, 3].map(floor => (
                <Button
                  key={floor}
                  variant={currentFloor === floor ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentFloor(floor)}
                  className="w-10 h-10"
                >
                  {floor}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="absolute top-24 left-4 right-4 z-10 max-w-md mx-auto">
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search for room (e.g., A233, 11840)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 bg-white/90 backdrop-blur-sm border-slate-200 focus:border-blue-500"
            />
          </div>
          
          {/* Search Suggestions */}
          {showSuggestions && filteredRooms.length > 0 && (
            <Card className="absolute top-full mt-1 w-full bg-white/95 backdrop-blur-sm border-slate-200">
              <CardContent className="p-2">
                {filteredRooms.slice(0, 5).map(room => (
                  <button
                    key={room.id}
                    onClick={() => handleRoomSelect(room)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    <div className="font-medium text-slate-900">{room.id}</div>
                    <div className="text-sm text-slate-600">{room.name} • Floor {room.floor}</div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Directions Panel */}
      {showDirections && (
        <div className="absolute top-40 left-4 z-10 w-80">
          <DirectionsPanel pathSteps={pathSteps} currentStep={currentStep} />
          
          {/* Navigation Controls */}
          <div className="mt-2 flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex-1"
            >
              ← Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={nextStep}
              disabled={currentStep === pathSteps.length - 1}
              className="flex-1"
            >
              Next →
            </Button>
          </div>
        </div>
      )}

      {/* Destination Info */}
      {destination && (
        <div className="absolute bottom-4 left-4 z-10">
          <Card className="bg-white/90 backdrop-blur-sm border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-slate-900">
                      {rooms.find(r => r.id === destination)?.name}
                    </div>
                    <div className="text-sm text-slate-600">
                      Room {destination} • Floor {rooms.find(r => r.id === destination)?.floor}
                    </div>
                    {pathSteps.length > 0 && (
                      <div className="text-xs text-blue-600 mt-1">
                        Step {currentStep + 1} of {pathSteps.length}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDestination}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls Info */}
      <div className="absolute bottom-4 right-4 z-10">
        <Card className="bg-white/90 backdrop-blur-sm border-slate-200">
          <CardContent className="p-3">
            <div className="text-xs text-slate-600 space-y-1">
              <div>🖱️ Click & drag to rotate</div>
              <div>🔍 Scroll to zoom</div>
              <div>⌨️ Right-click & drag to pan</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [8, 8, 8], fov: 60 }}
        className="w-full h-full"
      >
        <Scene3D destination={destination} currentFloor={currentFloor} pathSteps={pathSteps} />
      </Canvas>

      {/* AR Overlay */}
      {destination && (
        <AROverlay
          isActive={isARActive}
          onToggle={toggleAR}
          currentStep={currentStep}
          directions={arDirections}
          destination={`${destination} - ${rooms.find(r => r.id === destination)?.name}`}
          onNextStep={nextStep}
          onPrevStep={prevStep}
        />
      )}
    </div>
  )
}