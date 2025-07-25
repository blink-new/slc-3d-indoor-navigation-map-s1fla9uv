import React, { useState, useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Box } from '@react-three/drei'
import { Search, Navigation, MapPin, Layers } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'

// Sample room data for St. Lawrence College
const rooms = [
  { id: 'A233', name: 'Computer Lab A233', floor: 2, position: [2, 2, 0], type: 'lab' },
  { id: '11840', name: 'Lecture Hall 11840', floor: 1, position: [-2, 1, 2], type: 'classroom' },
  { id: 'B101', name: 'Biology Lab B101', floor: 1, position: [0, 1, -2], type: 'lab' },
  { id: 'C205', name: 'Chemistry Lab C205', floor: 2, position: [-1, 2, 1], type: 'lab' },
  { id: 'CAFE', name: 'Cafeteria', floor: 1, position: [3, 1, 0], type: 'dining' },
  { id: 'LIB', name: 'Library', floor: 2, position: [0, 2, 3], type: 'library' }
]

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

// 3D Floor component
function Floor({ level, rooms, destination, currentFloor }: { level: number, rooms: any[], destination: string | null, currentFloor: number }) {
  const floorRooms = rooms.filter(room => room.floor === level)
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
          isOnPath={false}
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

// Main entrance marker
function Entrance() {
  const meshRef = useRef<any>()
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = 0.2 + Math.sin(state.clock.elapsedTime * 2) * 0.1
    }
  })
  
  return (
    <group position={[0, 1, -4]}>
      <mesh ref={meshRef}>
        <coneGeometry args={[0.2, 0.4, 8]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <Text
        position={[0, 0.8, 0]}
        fontSize={0.15}
        color="#dc2626"
        anchorX="center"
        anchorY="middle"
      >
        ENTRANCE
      </Text>
    </group>
  )
}

// 3D Scene component
function Scene3D({ destination, currentFloor }: { destination: string | null, currentFloor: number }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      
      <Entrance />
      
      {[1, 2, 3].map(floor => (
        <Floor
          key={floor}
          level={floor}
          rooms={rooms}
          destination={destination}
          currentFloor={currentFloor}
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

export default function Navigation3D() {
  const [searchQuery, setSearchQuery] = useState('')
  const [destination, setDestination] = useState<string | null>(null)
  const [currentFloor, setCurrentFloor] = useState(1)
  const [filteredRooms, setFilteredRooms] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

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
  }

  const clearDestination = () => {
    setDestination(null)
    setSearchQuery('')
    setCurrentFloor(1)
  }

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
        <Scene3D destination={destination} currentFloor={currentFloor} />
      </Canvas>
    </div>
  )
}