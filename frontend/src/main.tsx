import React from 'react'
import { createRoot } from 'react-dom/client'
import 'maplibre-gl/dist/maplibre-gl.css'
import './styles.css'
import './scene-additions.css'
import './replay.css'
import './service-list.css'
import './basemap.css'
import './workstation-controls.css'
import './status.css'
import './studio.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
