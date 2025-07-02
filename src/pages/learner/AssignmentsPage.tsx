import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Target, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  BookOpen,
  Search
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Assignment } from '../../types/index';

export const AssignmentsPage: React.FC = () => {
  const { showError } = useNotification();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setIsLoading(true);
        const data = await apiClient.getAssignments();
        console.log(data); // Inspect the structure of the API response
        setAssignments(data);
        setFilteredAssignments(data);
      } catch (error) {
        showError('Error', 'Failed to load assignments');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignments();
  }, [showError]);

  useEffect(() => {
    let filtered = assignments;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(assignment =>
        assignment.module_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(assignment => {
        const isCompleted = assignment.completion_percentage === 100;
        const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date();
        
        switch (statusFilter) {
          case 'completed':
            return isCompleted;
          case 'pending':
            return !isCompleted && !isOverdue;
          case 'overdue':
            return !isCompleted && isOverdue;
          default:
            return true;
        }
      });
    }

    setFilteredAssignments(filtered);
  }, [assignments, searchTerm, statusFilter]);

  const getAssignmentStatus = (assignment: Assignment) => {
    if (assignment.completion_percentage === 100) {
      return { status: 'completed', color: 'text-primary-600', bg: 'bg-primary-100' };
    }
    
    if (assignment.due_date && new Date(assignment.due_date) < new Date()) {
      return { status: 'overdue', color: 'text-red-600', bg: 'bg-red-100' };
    }
    
    return { status: 'pending', color: 'text-accent-600', bg: 'bg-accent-100' };
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}


      {/* Search and Filters */}
      <div className="card p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search assignments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          {/* Status Filter */}
          <div className="md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-neutral-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Target className="w-6 h-6 text-neutral-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 mb-1">
            {assignments.length}
          </div>
          <div className="text-sm text-neutral-600">Total Assignments</div>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6 text-primary-600" />
          </div>
          <div className="text-2xl font-bold text-primary-600 mb-1">
            {assignments.filter(a => a.completion_percentage === 100).length}
          </div>
          <div className="text-sm text-neutral-600">Completed</div>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-accent-600" />
          </div>
          <div className="text-2xl font-bold text-accent-600 mb-1">
            {assignments.filter(a => a.completion_percentage !== 100 && (!a.due_date || new Date(a.due_date) >= new Date())).length}
          </div>
          <div className="text-sm text-neutral-600">Pending</div>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-600 mb-1">
            {assignments.filter(a => a.completion_percentage !== 100 && a.due_date && new Date(a.due_date) < new Date()).length}
          </div>
          <div className="text-sm text-neutral-600">Overdue</div>
        </div>
      </div>

      {/* Assignments List */}
      {filteredAssignments.length > 0 ? (
        <div className="space-y-4">
          {filteredAssignments.map((assignment) => {
            const statusInfo = getAssignmentStatus(assignment);
            const daysUntilDue = assignment.due_date ? getDaysUntilDue(assignment.due_date) : null;

            return (
              <div key={assignment.id} className="card p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                        {assignment.module_title}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-neutral-600">
                        <span className="capitalize">{assignment.assignment_type}</span>
                        {assignment.is_mandatory && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            Mandatory
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                      {statusInfo.status.charAt(0).toUpperCase() + statusInfo.status.slice(1)}
                    </span>
                  </div>
                </div>

                {assignment.notes && (
                  <p className="text-neutral-600 mb-4">{assignment.notes}</p>
                )}

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-neutral-700">Progress</span>
                    <span className="text-sm text-neutral-600">
                      {assignment.completion_percentage || 0}%
                    </span>
                  </div>
                  <ProgressBar 
                    value={assignment.completion_percentage || 0}
                    color={assignment.completion_percentage === 100 ? 'primary' : 'secondary'}
                    animated
                  />
                </div>

                {/* Due Date and Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-neutral-600">
                    {assignment.due_date && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                        {daysUntilDue !== null && (
                          <span className={`ml-2 ${
                            daysUntilDue < 0 ? 'text-red-600' : 
                            daysUntilDue <= 3 ? 'text-accent-600' : 
                            'text-neutral-600'
                          }`}>
                            {daysUntilDue < 0 
                              ? `${Math.abs(daysUntilDue)} days overdue`
                              : daysUntilDue === 0 
                              ? 'Due today'
                              : `${daysUntilDue} days left`
                            }
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <Link
                    to={`/modules/${assignment.module_id}`}
                    className="btn-primary"
                  >
                    {assignment.completion_percentage === 100 ? 'Review' : 'Continue'}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">
            {assignments.length === 0 ? 'No assignments yet' : 'No assignments found'}
          </h3>
          <p className="text-neutral-600 mb-4">
            {assignments.length === 0 
              ? 'You don\'t have any assignments at the moment.'
              : 'Try adjusting your search terms or filters.'
            }
          </p>
          {assignments.length === 0 && (
            <Link to="/modules" className="btn-primary">
              Explore Modules
            </Link>
          )}
        </div>
      )}
    </Layout>
  );
};