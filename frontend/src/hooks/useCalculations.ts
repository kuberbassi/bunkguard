import { useState, useCallback } from 'react'
import { AttendanceCalculator, GradeCalculator } from '@/lib/calculationEngine'

interface AttendanceData {
  subjects: any[];
  summary: any;
}

interface GradeData {
  sgpa?: number;
  cgpa?: number;
}

export const useAttendanceCalculations = () => {
  const [attendance, setAttendance] = useState<AttendanceData | null>(null)
  const [loading, setLoading] = useState(false)

  const calculateAttendance = useCallback(async (subjects: any[]) => {
    setLoading(true)
    try {
      const results = subjects.map(subject => {
        const attended = subject.attended || 0
        const total = subject.total || 0

        const percentage = AttendanceCalculator.calculatePercentage(attended, total)
        const { riskLevel, color } = AttendanceCalculator.getRiskLevel(percentage)
        const daysNeeded75 = AttendanceCalculator.calculateDaysNeeded(attended, total, 75)
        const daysNeeded85 = AttendanceCalculator.calculateDaysNeeded(attended, total, 85)

        return {
          ...subject,
          percentage: Math.round(percentage * 100) / 100,
          riskLevel,
          color,
          daysNeeded: { target75: daysNeeded75, target85: daysNeeded85 }
        }
      })

      const summary = AttendanceCalculator.getAttendanceSummary(results)
      setAttendance({ subjects: results, summary })
    } catch (error) {
      console.error('Calculation error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  return { attendance, loading, calculateAttendance }
}

export const useGradeCalculations = () => {
  const [grades, setGrades] = useState<GradeData | null>(null)
  const [loading, setLoading] = useState(false)

  const calculateSGPA = useCallback(async (courses: any[]) => {
    setLoading(true)
    try {
      const result = GradeCalculator.calculateSGPA(courses)
      setGrades({ sgpa: result })
    } catch (error) {
      console.error('SGPA calculation error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const calculateCGPA = useCallback(async (semesters: any[][]) => {
    setLoading(true)
    try {
      const result = GradeCalculator.calculateCGPA(semesters)
      setGrades({ cgpa: result })
    } catch (error) {
      console.error('CGPA calculation error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  return { grades, loading, calculateSGPA, calculateCGPA }
}
