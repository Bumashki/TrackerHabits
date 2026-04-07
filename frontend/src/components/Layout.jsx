import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import Modal from './Modal'
import HabitForm from './HabitForm'
import { useHabits } from '../context/HabitsContext'

// Layout — оболочка всех страниц.
// Хранит состояние модального окна привычки, чтобы кнопка в Topbar
// и кнопка «Редактировать» на странице Habits работали из одного места.
export default function Layout() {
  const { create, update } = useHabits()
  const [formOpen, setFormOpen]       = useState(false)
  const [editingHabit, setEditingHabit] = useState(null) // null = создание
  const [navOpen, setNavOpen]         = useState(false)

  useEffect(() => {
    function onResize() {
      if (window.innerWidth > 768) setNavOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function openCreate() {
    setEditingHabit(null)
    setFormOpen(true)
  }

  function openEdit(habit) {
    setEditingHabit(habit)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingHabit(null)
  }

  async function handleSubmit(data) {
    if (editingHabit) {
      await update(editingHabit.id, data)
    } else {
      await create(data)
    }
    closeForm()
  }

  function closeNav() {
    setNavOpen(false)
  }

  return (
    <div className={`shell${navOpen ? ' shell-nav-open' : ''}`}>
      <button
        type="button"
        className="nav-backdrop"
        aria-label="Закрыть меню"
        onClick={closeNav}
      />
      <Sidebar onNavigate={closeNav} open={navOpen} />

      <main className="main">
        <Topbar onNewHabit={openCreate} onOpenNav={() => setNavOpen(true)} />

        <div className="content">
          {/* Outlet передаёт openEdit дочерним страницам через useOutletContext() */}
          <Outlet context={{ openEdit }} />
        </div>
      </main>

      <Modal
        title={editingHabit ? 'Редактировать привычку' : 'Новая привычка'}
        open={formOpen}
        onClose={closeForm}
      >
        <HabitForm
          habit={editingHabit}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      </Modal>
    </div>
  )
}
