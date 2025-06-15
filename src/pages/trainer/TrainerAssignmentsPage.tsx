import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Target, 
  Calendar, 
  Users,
  BookOpen,
  Eye,
  Edit,
  Trash2,
  Search,
  Filter
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Modal } from '../../components/ui/Modal';

export const TrainerAssignmentsPage: React.FC = () => {
  const { showError, showSuccess } = useNotification();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [assignmentDetails, setAssignmentDetails] = useState<any>(null);

  const [newAssignment, setNewAssignment] = useState({
    module_id: '',
    assignment_type: 'individual',
    individual_id: '',
    department_id: '',
    employer_id: '',
    due_date: '',
    is_mandatory: true,
    notes: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [assignmentsData, modulesData] = await Promise.all([
          apiClient.getTrainerAssignments(),
          apiClient.getTrainerModules()
        ]);
        setAssignments(assignmentsData);
        setModules(modulesData.modules);
      } catch (error) {
        showError('Error', 'Failed to load assignments');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [showError]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.createAssignment(newAssignment);
      showSuccess('Assignment Created', 'Assignment has been created successfully');
      setIsCreateModalOpen(false);
      setNewAssignment({
        module_id: '',
        assignment_type: 'individual',
        individual_id: '',
        department_id: '',
        employer_id: '',
        due_date: '',
        is_mandatory: true,
        notes: ''
      });
      
      // Refresh assignments
      const data = await apiClient.getTrainerAssignments();
      setAssignments(data);
    } catch (error) {
      showError('Error', 'Failed to create assignment');
    }
  };

  const handleViewDetails = async (assignment: any) => {
    try {
      setSelectedAssignment(assignment);
      const details = await apiClient.getAssignmentDetails(assignment.id);
      setAssignmentDetails(details);
      setIsDetailsModalOpen(true);
    } catch (error) {
      showError('Error', 'Failed to load assignment details');
    }
  };

  const handleDeleteAssignment = async (assignmentId: number) => {
    if (window.confirm('Are you sure you want to delete this assignment?')) {
      try {
        await apiClient.deleteAssignment(assignmentId);
        showSuccess('Assignment Deleted', 'Assignment has been deleted successfully');
        
        // Refresh assignments
        const data = await apiClient.getTrainerAssignments();
        setAssignments(data);
      } catch (error) {
        showError('Error', 'Failed to delete assignment');
      }
    }
  };

  const filteredAssignments = assignments.filter(assignment =>
    assignment.module_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assignment.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Assignments</h1>
            <p className="text-neutral-600">
              Create and manage module assignments for your learners.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Assignment</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Target className="w-6 h-6 text-primary-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 mb-1">
            {assignments.length}
          </div>
          <div className="text-sm text-neutral-600">Total Assignments</div>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-secondary-600" />
          </div>
          <div className="text-2xl font-bold text-secondary-600 mb-1">
            {assignments.reduce((total, assignment) => total + (assignment.assigned_count || 0), 0)}
          </div>
          <div className="text-sm text-neutral-600">Total Assigned</div>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6 text-accent-600" />
          </div>
          <div className="text-2xl font-bold text-accent-600 mb-1">
            {assignments.filter(a => a.due_date && new Date(a.due_date) >= new Date()).length}
          </div>
          <div className="text-sm text-neutral-600">Active</div>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600 mb-1">
            {assignments.reduce((total, assignment) => total + (assignment.completed_count || 0), 0)}
          </div>
          <div className="text-sm text-neutral-600">Completed</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
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
          <button className="btn-outline flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Assignments List */}
      {filteredAssignments.length > 0 ? (
        <div className="space-y-4">
          {filteredAssignments.map((assignment) => (
            <div key={assignment.id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
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
                      {assignment.due_date && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleViewDetails(assignment)}
                    className="p-2 text-neutral-600 hover:text-primary-600 rounded-lg hover:bg-primary-50"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAssignment(assignment.id)}
                    className="p-2 text-neutral-600 hover:text-red-600 rounded-lg hover:bg-red-50"
                    title="Delete Assignment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {assignment.notes && (
                <p className="text-neutral-600 mb-4">{assignment.notes}</p>
              )}

              {/* Progress */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-neutral-50 rounded-lg">
                  <div className="text-lg font-bold text-secondary-600">
                    {assignment.assigned_count || 0}
                  </div>
                  <div className="text-xs text-neutral-600">Assigned</div>
                </div>
                <div className="text-center p-3 bg-neutral-50 rounded-lg">
                  <div className="text-lg font-bold text-accent-600">
                    {assignment.completed_count || 0}
                  </div>
                  <div className="text-xs text-neutral-600">Completed</div>
                </div>
                <div className="text-center p-3 bg-neutral-50 rounded-lg">
                  <div className="text-lg font-bold text-primary-600">
                    {assignment.assigned_count > 0 
                      ? Math.round((assignment.completed_count / assignment.assigned_count) * 100)
                      : 0
                    }%
                  </div>
                  <div className="text-xs text-neutral-600">Completion Rate</div>
                </div>
              </div>

              <div className="mt-4">
                <ProgressBar 
                  value={assignment.assigned_count > 0 
                    ? (assignment.completed_count / assignment.assigned_count) * 100
                    : 0
                  }
                  animated
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">
            {assignments.length === 0 ? 'No assignments created yet' : 'No assignments found'}
          </h3>
          <p className="text-neutral-600 mb-4">
            {assignments.length === 0 
              ? 'Create your first assignment to get started.'
              : 'Try adjusting your search terms.'
            }
          </p>
          {assignments.length === 0 && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary"
            >
              Create Your First Assignment
            </button>
          )}
        </div>
      )}

      {/* Create Assignment Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Assignment"
        size="lg"
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Module
            </label>
            <select
              value={newAssignment.module_id}
              onChange={(e) => setNewAssignment(prev => ({ ...prev, module_id: e.target.value }))}
              className="input-field"
              required
            >
              <option value="">Select a module</option>
              {modules.map(module => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Assignment Type
            </label>
            <select
              value={newAssignment.assignment_type}
              onChange={(e) => setNewAssignment(prev => ({ ...prev, assignment_type: e.target.value }))}
              className="input-field"
            >
              <option value="individual">Individual</option>
              <option value="department">Department</option>
              <option value="all">All Users</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Due Date (Optional)
            </label>
            <input
              type="date"
              value={newAssignment.due_date}
              onChange={(e) => setNewAssignment(prev => ({ ...prev, due_date: e.target.value }))}
              className="input-field"
            />
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={newAssignment.is_mandatory}
                onChange={(e) => setNewAssignment(prev => ({ ...prev, is_mandatory: e.target.checked }))}
                className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-neutral-700">Mandatory Assignment</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={newAssignment.notes}
              onChange={(e) => setNewAssignment(prev => ({ ...prev, notes: e.target.value }))}
              className="input-field min-h-20"
              placeholder="Add any additional instructions or notes..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button type="submit" className="btn-primary flex-1">
              Create Assignment
            </button>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="btn-outline flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Assignment Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={selectedAssignment ? `${selectedAssignment.module_title} - Assignment Details` : ''}
        size="xl"
      >
        {assignmentDetails && (
          <div className="space-y-6">
            {/* Assignment Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-neutral-900 mb-2">Assignment Details</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Type:</strong> {assignmentDetails.assignment.assignment_type}</div>
                  <div><strong>Mandatory:</strong> {assignmentDetails.assignment.is_mandatory ? 'Yes' : 'No'}</div>
                  {assignmentDetails.assignment.due_date && (
                    <div><strong>Due Date:</strong> {new Date(assignmentDetails.assignment.due_date).toLocaleDateString()}</div>
                  )}
                  {assignmentDetails.assignment.notes && (
                    <div><strong>Notes:</strong> {assignmentDetails.assignment.notes}</div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-neutral-900 mb-2">Progress Summary</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-secondary-50 rounded-lg">
                    <div className="text-lg font-bold text-secondary-600">
                      {assignmentDetails.assigned_users?.length || 0}
                    </div>
                    <div className="text-xs text-neutral-600">Assigned</div>
                  </div>
                  <div className="text-center p-3 bg-primary-50 rounded-lg">
                    <div className="text-lg font-bold text-primary-600">
                      {assignmentDetails.assigned_users?.filter((user: any) => 
                        user.total_content > 0 && user.completed_content === user.total_content
                      ).length || 0}
                    </div>
                    <div className="text-xs text-neutral-600">Completed</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Assigned Users */}
            <div>
              <h4 className="font-semibold text-neutral-900 mb-3">Assigned Users</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {assignmentDetails.assigned_users?.map((user: any) => (
                  <div key={user.id} className="flex items-center space-x-3 p-3 bg-neutral-50 rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-medium">
                        {user.first_name[0]}{user.last_name[0]}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900 text-sm">
                        {user.first_name} {user.last_name}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <ProgressBar 
                          value={user.total_content > 0 ? (user.completed_content / user.total_content) * 100 : 0}
                          size="sm"
                          className="flex-1"
                        />
                        <span className="text-xs text-neutral-600">
                          {user.completed_content}/{user.total_content}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      user.total_content > 0 && user.completed_content === user.total_content
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-neutral-100 text-neutral-700'
                    }`}>
                      {user.total_content > 0 && user.completed_content === user.total_content ? 'Completed' : 'In Progress'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};