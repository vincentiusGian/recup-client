import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
// import './App.css'
import { getCompetitions } from './api/competitions';
import { getRegistrationData } from './api/registrationdata';
import axiosInstance from './api/axiosInstance';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from './pages/Home';

function App() {
  return (
    
      <Routes>
        <Route path='/' element={<Home/>} />
      </Routes>

  )
}

export default App
