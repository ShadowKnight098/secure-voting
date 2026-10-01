import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Vote, Activity, UsersRound, Plus, ChevronRight, UserCheck, Clock } from 'lucide-react';
import { dashboardService } from '../../services/dashboardService';
import { useAuth } from '../../context/AuthContext';
import StatsCard from '../../components/ui/StatsCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentElections, setRecentElections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsData, recentData] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getRecentElections()
        ]);
        setStats(statsData);
        setRecentElections(recentData);
      } catch (error) {
        console.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded animate-skeleton mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 rounded-xl animate-skeleton"></div>)}
        </div>
        <div className="h-96 rounded-xl animate-skeleton mt-8"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Hello, {user?.username} 👋</h2>
          <p className="text-slate-400 mt-1">Here's an overview of the electronic voting system.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/admin/voters')} icon={UsersRound}>
            Manage Voters
          </Button>
          <Button onClick={() => navigate('/admin/elections/new')} icon={Plus}>
            Create Election
          </Button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Elections" 
          value={stats?.totalElections || 0} 
          icon={Vote} 
          color="indigo" 
        />
        <StatsCard 
          title="Active Elections" 
          value={stats?.activeElections || 0} 
          icon={Activity} 
          color="emerald" 
          trend="up"
          trendValue={`${stats?.upcomingElections || 0} upcoming`}
        />
        <StatsCard 
          title="Total Candidates" 
          value={stats?.totalCandidates || 0} 
          icon={Users} 
          color="blue" 
        />
        <StatsCard 
          title="Registered Voters" 
          value={stats?.totalVoters?.toLocaleString() || 0} 
          icon={UsersRound} 
          color="violet" 
          trend="up"
          trendValue={`${stats?.verifiedVoters || 0} verified`}
        />
      </div>

      {/* Voter Verification Breakdown Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5 flex items-center justify-between bg-slate-900/60 border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <UserCheck size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Verified Voters</p>
              <p className="text-xl font-bold text-white">{stats?.verifiedVoters || 0}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/voters')}>
            View <ChevronRight size={14} />
          </Button>
        </Card>

        <Card className="p-5 flex items-center justify-between bg-slate-900/60 border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Pending Verification</p>
              <p className="text-xl font-bold text-amber-400">{stats?.pendingVoters || 0}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/voters')}>
            Verify <ChevronRight size={14} />
          </Button>
        </Card>

        <Card className="p-5 flex items-center justify-between bg-slate-900/60 border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Vote size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Ballots Cast</p>
              <p className="text-xl font-bold text-white">{stats?.votedCount || 0}</p>
            </div>
          </div>
          <span className="text-xs text-slate-500">Module 4 Ready</span>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Recent Elections</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/elections')}>
            View All <ChevronRight size={16} className="ml-1" />
          </Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700/50 text-sm font-medium text-slate-400">
                <th className="pb-3 pr-4 font-medium">Election Name</th>
                <th className="pb-3 px-4 font-medium">Status</th>
                <th className="pb-3 px-4 font-medium text-right">Candidates</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {recentElections.length === 0 ? (
                <tr>
                  <td colSpan="3" className="py-8 text-center text-slate-500">
                    No recent elections found.
                  </td>
                </tr>
              ) : (
                recentElections.map(election => (
                  <tr key={election.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 pr-4 font-medium text-white">{election.title}</td>
                    <td className="py-4 px-4">
                      <Badge status={election.status} />
                    </td>
                    <td className="py-4 px-4 text-right text-slate-300">{election.participants}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default DashboardPage;
