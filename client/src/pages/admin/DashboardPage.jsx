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
        <div className="h-8 w-48 rounded-[10px] animate-skeleton mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-36 rounded-[14px] animate-skeleton"></div>)}
        </div>
        <div className="h-96 rounded-[14px] animate-skeleton mt-8"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in text-ink">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            Hello, {user?.username} 👋
          </h2>
          <p className="text-ink/70 font-medium text-sm mt-1">Here's what's happening across elections today.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/admin/voters')} icon={UsersRound}>
            Manage voters
          </Button>
          {/* One Main Pink Action */}
          <Button variant="primary" onClick={() => navigate('/admin/elections/new')} icon={Plus}>
            Create election
          </Button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatsCard 
          title="Total elections" 
          value={stats?.totalElections || 0} 
          icon={Vote} 
        />
        <StatsCard 
          title="Active elections" 
          value={stats?.activeElections || 0} 
          icon={Activity} 
          trendValue={`${stats?.upcomingElections || 0} upcoming`}
        />
        <StatsCard 
          title="Total candidates" 
          value={stats?.totalCandidates || 0} 
          icon={Users} 
        />
        <StatsCard 
          title="Registered voters" 
          value={stats?.totalVoters?.toLocaleString() || 0} 
          icon={UsersRound} 
          trendValue={`${stats?.verifiedVoters || 0} verified`}
        />
      </div>

      {/* Voter Verification Breakdown Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[12px] bg-mint border-2 border-ink shadow-neo-sm flex items-center justify-center text-ink">
              <UserCheck size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-ink/70">Verified voters</p>
              <p className="text-2xl font-extrabold text-ink">{stats?.verifiedVoters || 0}</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/admin/voters')}>
            View <ChevronRight size={14} className="ml-1" />
          </Button>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[12px] bg-sun border-2 border-ink shadow-neo-sm flex items-center justify-center text-ink">
              <Clock size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-ink/70">Pending verification</p>
              <p className="text-2xl font-extrabold text-ink">{stats?.pendingVoters || 0}</p>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => navigate('/admin/voters')}>
            Review <ChevronRight size={14} className="ml-1" />
          </Button>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[12px] bg-sky border-2 border-ink shadow-neo-sm flex items-center justify-center text-ink">
              <Vote size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-ink/70">Ballots cast</p>
              <p className="text-2xl font-extrabold text-ink">{stats?.votedCount || 0}</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-lavender border-2 border-ink text-xs font-bold text-ink shadow-neo-sm">
            Module 4
          </span>
        </Card>
      </div>

      {/* Recent Elections Table Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-ink">
          <h3 className="text-xl font-bold text-ink">Recent elections</h3>
          <Button variant="secondary" size="sm" onClick={() => navigate('/admin/elections')}>
            View all <ChevronRight size={16} className="ml-1" />
          </Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-lavender border-b-2 border-ink text-xs font-extrabold uppercase text-ink tracking-wider">
                <th className="py-3.5 px-4">Election title</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Candidates</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y-2 divide-ink">
              {recentElections.length === 0 ? (
                <tr>
                  <td colSpan="3" className="py-8 text-center text-ink/70 font-medium">
                    No recent elections found.
                  </td>
                </tr>
              ) : (
                recentElections.map(election => (
                  <tr key={election.id} className="hover:bg-lavender/60 transition-colors">
                    <td className="py-4 px-4 font-bold text-ink">{election.title}</td>
                    <td className="py-4 px-4">
                      <Badge status={election.status} />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="inline-flex items-center justify-center px-3 py-0.5 rounded-full bg-lavender/80 border-2 border-ink font-mono font-bold text-xs shadow-neo-sm">
                        {election.participants}
                      </span>
                    </td>
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
