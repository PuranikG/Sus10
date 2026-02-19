import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, Users, Clock, MessageSquare,
  ArrowLeft, ChevronRight, Check, Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Checkbox } from '../components/ui/checkbox';
import { apiRequest } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { toast } from 'sonner';

export default function LeadFormPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const buildingId = searchParams.get('building');
  const providerId = searchParams.get('provider');

  const [formData, setFormData] = useState({
    timeline: '3_months',
    budget_disclosed: true,
    budget_amount: '',
    additional_notes: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!buildingId) {
      toast.error('Please select a building first');
      return;
    }

    setSubmitting(true);

    try {
      await apiRequest('/leads/create', {
        method: 'POST',
        body: JSON.stringify({
          building_id: buildingId,
          provider_id: providerId || null,
          timeline: formData.timeline,
          budget_disclosed: formData.budget_disclosed,
          budget_amount: formData.budget_disclosed ? parseInt(formData.budget_amount) || null : null,
          additional_notes: formData.additional_notes,
        }),
      });
      setSubmitted(true);
      toast.success('Lead submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit lead');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container-max section-padding py-20 text-center">
          <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-heading font-bold mb-2">Sign In Required</h1>
          <p className="text-muted-foreground mb-6">
            Please sign in to submit a project inquiry.
          </p>
          <Button onClick={login}>Sign In to Continue</Button>
        </div>
        <Footer />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container-max section-padding py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto text-center"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Check className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-heading font-bold mb-4">Request Submitted!</h1>
            <p className="text-muted-foreground mb-8">
              Thank you for your inquiry. A provider will contact you within 24-48 hours 
              to discuss your project requirements.
            </p>
            <div className="flex flex-col gap-3">
              <Link to="/dashboard">
                <Button className="w-full">Go to Dashboard</Button>
              </Link>
              <Link to="/search">
                <Button variant="outline" className="w-full">Explore More Buildings</Button>
              </Link>
            </div>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container-max section-padding py-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link to="/search" className="hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span>Request Quote</span>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          <div className="flex items-center gap-4 mb-8">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                1
              </div>
              <span className="text-sm font-medium">Project Details</span>
            </div>
            <div className="flex-1 h-1 bg-muted rounded-full">
              <div className={`h-full bg-primary rounded-full transition-all ${step >= 2 ? 'w-full' : 'w-0'}`} />
            </div>
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                2
              </div>
              <span className="text-sm font-medium">Additional Info</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Project Details</CardTitle>
                    <CardDescription>
                      Tell us about your timeline and requirements
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Timeline */}
                    <div className="space-y-4">
                      <Label>When do you want to start?</Label>
                      <RadioGroup
                        value={formData.timeline}
                        onValueChange={(value) => setFormData({ ...formData, timeline: value })}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[
                            { value: '1_month', label: 'Within 1 Month', icon: '🚀' },
                            { value: '3_months', label: '1-3 Months', icon: '📅' },
                            { value: '6_months', label: '3-6 Months', icon: '🎯' },
                          ].map((option) => (
                            <div key={option.value}>
                              <RadioGroupItem
                                value={option.value}
                                id={option.value}
                                className="peer sr-only"
                              />
                              <Label
                                htmlFor={option.value}
                                className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                              >
                                <span className="text-2xl mb-2">{option.icon}</span>
                                <span className="font-medium">{option.label}</span>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Budget */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Budget (optional)</Label>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="budget_disclosed"
                            checked={formData.budget_disclosed}
                            onCheckedChange={(checked) => 
                              setFormData({ ...formData, budget_disclosed: checked })
                            }
                          />
                          <label
                            htmlFor="budget_disclosed"
                            className="text-sm text-muted-foreground cursor-pointer"
                          >
                            Share budget with provider
                          </label>
                        </div>
                      </div>
                      {formData.budget_disclosed && (
                        <Input
                          type="number"
                          placeholder="Enter budget in ₹"
                          value={formData.budget_amount}
                          onChange={(e) => setFormData({ ...formData, budget_amount: e.target.value })}
                        />
                      )}
                    </div>

                    <Button
                      type="button"
                      className="w-full"
                      onClick={() => setStep(2)}
                      data-testid="next-step-btn"
                    >
                      Continue
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Information</CardTitle>
                    <CardDescription>
                      Any specific requirements or questions?
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes for the provider</Label>
                      <Textarea
                        id="notes"
                        placeholder="Describe your project requirements, questions, or any specific needs..."
                        value={formData.additional_notes}
                        onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                        rows={5}
                      />
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="font-medium mb-2">What happens next?</h4>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          Your request will be sent to qualified providers
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          Providers will review your requirements
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          You'll receive quotes within 24-48 hours
                        </li>
                      </ul>
                    </div>

                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep(1)}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={submitting}
                        data-testid="submit-lead-btn"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          'Submit Request'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}
