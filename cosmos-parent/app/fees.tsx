import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, Modal, Platform, Linking, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { useColors } from '../constants/theme'
import { useParentContext } from '../lib/ParentContext'
import { supabase } from '../lib/supabase'
import { ArrowLeft, CheckCircle2, AlertCircle, UploadCloud, CreditCard, ExternalLink } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import { decode } from 'base64-arraybuffer'

interface FeeRecord {
  id: string
  fee_month: string
  amount: number
  status: 'pending' | 'submitted' | 'verified' | 'rejected'
  receipt_url: string | null
}

export default function FeesScreen() {
  const Colors = useColors()
  const router = useRouter()
  const { selectedStudent, institute, loading: ctxLoading } = useParentContext()
  const [records, setRecords] = useState<FeeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [upiId, setUpiId] = useState('cosmos@oksbi')
  const [payeeName, setPayeeName] = useState(institute?.name || 'Academy')

  // Payment upload state
  const [selectedRecord, setSelectedRecord] = useState<FeeRecord | null>(null)
  const [isManual, setIsManual] = useState(false)
  const [manualMonth, setManualMonth] = useState('')
  const [manualAmount, setManualAmount] = useState('')
  const [uploading, setUploading] = useState(false)
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [showPopup, setShowPopup] = useState(false)

  useEffect(() => {
    // Fetch dynamic UPI settings
    supabase.from('app_settings').select('key, value').in('key', ['upi_id', 'upi_payee_name']).then(({ data }) => {
      if (data) {
        const id = data.find(d => d.key === 'upi_id')?.value
        const name = data.find(d => d.key === 'upi_payee_name')?.value
        if (id) setUpiId(id)
        if (name) setPayeeName(name)
      }
    })
  }, [])

  useEffect(() => {
    if (!ctxLoading && selectedStudent) loadFeeRecords()
  }, [ctxLoading, selectedStudent?.id])

  async function loadFeeRecords() {
    if (!selectedStudent) { setLoading(false); return }
    const { data } = await supabase
      .from('fee_records')
      .select('*')
      .eq('student_id', selectedStudent.id)
      .order('fee_month', { ascending: false })
    if (data) setRecords(data)
    setLoading(false)
  }

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true
    })

    if (!result.canceled && result.assets[0].base64) {
      setImageUri(result.assets[0].uri)
      uploadReceipt(result.assets[0].base64)
    }
  }

  const uploadReceipt = async (base64: string) => {
    if (!selectedStudent) return
    if (!selectedRecord && (!manualMonth || !manualAmount)) return

    setUploading(true)
    try {
      const month = selectedRecord ? selectedRecord.fee_month : manualMonth
      const amount = selectedRecord ? selectedRecord.amount : Number(manualAmount)
      const filePath = `receipt_${selectedStudent.id}_${month}_${Date.now()}.jpg`
      
      const { error: uploadError } = await supabase.storage
        .from('payment_receipts')
        .upload(filePath, decode(base64), { contentType: 'image/jpeg', upsert: true })

      if (uploadError) throw uploadError

      if (selectedRecord) {
        const { error: updateError } = await supabase
          .from('fee_records')
          .update({
            status: 'submitted',
            receipt_url: filePath,
            submitted_at: new Date().toISOString()
          })
          .eq('id', selectedRecord.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('fee_records')
          .upsert({
            student_id: selectedStudent.id,
            fee_month: month,
            amount: amount,
            status: 'submitted',
            receipt_url: filePath,
            submitted_at: new Date().toISOString()
          }, { onConflict: 'student_id,fee_month' })

        if (insertError) throw insertError
      }

      setShowPopup(true)
      loadFeeRecords()
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message)
    } finally {
      setUploading(false)
      setSelectedRecord(null)
      setIsManual(false)
      setManualMonth('')
      setManualAmount('')
    }
  }

  const handlePayViaUPI = (amount?: number) => {
    // UPI Deep Link Format
    let upiUrl = `upi://pay?pa=${upiId}&cu=INR&tn=CosmosFee`
    if (payeeName) upiUrl += `&pn=${encodeURIComponent(payeeName)}`
    if (amount) upiUrl += `&am=${amount}`
    
    Linking.openURL(upiUrl).catch(err => {
      Alert.alert('UPI Apps Not Found', 'Please use the QR code display to pay manually, or ensure a UPI app is installed.')
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return Colors.green
      case 'submitted': return Colors.orange
      case 'rejected': return Colors.red
      default: return Colors.muted
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.bg, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: Colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: Colors.text }]}>Fee Management</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* UPI section */}
        <TouchableOpacity 
          style={[styles.qrCard, { backgroundColor: Colors.card, borderColor: Colors.border }]}
          onPress={() => handlePayViaUPI()}
          activeOpacity={0.8}
        >
          <CreditCard size={32} color={Colors.primary} />
          <Text style={[styles.qrTitle, { color: Colors.text }]}>Pay via UPI</Text>
          <Text style={[styles.qrSub, { color: Colors.muted }]}>UPI ID: {upiId}</Text>
          <Text style={{ color: Colors.muted, fontSize: 11, textAlign: 'center', marginTop: 4 }}>
            Tap here to open your UPI app. Screenshot receipt after paying.
          </Text>
          <View style={[styles.staticPayBtn, { backgroundColor: Colors.primary }]}>
            <ExternalLink size={14} color="#fff" />
            <Text style={{ color: "#FFF", fontSize: 12, fontWeight: '600' }}>Open UPI App</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: Colors.muted }]}>Payment History</Text>
          <TouchableOpacity onPress={() => setIsManual(true)} style={[styles.addManualBtn, { borderColor: Colors.primary }]}>
            <UploadCloud size={14} color={Colors.primary} />
            <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '600' }}>Upload Screenshot</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recordList}>
          {records.map((rec) => (
            <View key={rec.id} style={[styles.recordRow, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
              <View>
                <Text style={[styles.monthText, { color: Colors.text }]}>{rec.fee_month}</Text>
                <Text style={{ color: Colors.muted, fontSize: 12 }}>₹{rec.amount}</Text>
              </View>

              <View style={styles.rowRight}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(rec.status) + '20', borderColor: getStatusColor(rec.status) + '40' }]}>
                  <Text style={{ color: getStatusColor(rec.status), fontSize: 11, fontWeight: 'bold' }}>
                    {rec.status.toUpperCase()}
                  </Text>
                </View>

                {(rec.status === 'pending' || rec.status === 'rejected') && (
                  <TouchableOpacity 
                    onPress={() => setSelectedRecord(rec)} 
                    style={[styles.payBtn, { backgroundColor: Colors.primary }]}
                  >
                    <Text style={{ color: "#FFF", fontSize: 11, fontWeight: '600' }}>Pay / Upload</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Standard Record Modal */}
      {selectedRecord && (
        <Modal visible={!!selectedRecord} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
              <Text style={[styles.modalTitle, { color: Colors.text }]}>Pay for {selectedRecord.fee_month}</Text>
              <Text style={{ color: Colors.muted, fontSize: 13, marginBottom: 20 }}>Amount: ₹{selectedRecord.amount}</Text>

              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: Colors.primary }]} 
                onPress={() => handlePayViaUPI(selectedRecord.amount)}
              >
                <ExternalLink size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '600' }}>Open UPI App</Text>
              </TouchableOpacity>

              <View style={{ marginVertical: 15, height: 1, backgroundColor: Colors.border }} />

              <TouchableOpacity 
                style={[styles.actionBtn, { borderColor: Colors.primary, borderWidth: 1 }]} 
                onPress={handlePickImage}
                disabled={uploading}
              >
                {uploading ? <ActivityIndicator size="small" color={Colors.primary} /> : <UploadCloud size={16} color={Colors.primary} />}
                <Text style={{ color: Colors.primary, fontWeight: '600' }}>Upload Screenshot</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ padding: 12, alignItems: 'center', marginTop: 10 }} 
                onPress={() => setSelectedRecord(null)}
              >
                <Text style={{ color: Colors.muted }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Manual Upload Modal */}
      <Modal visible={isManual} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
            <Text style={[styles.modalTitle, { color: Colors.text }]}>Submit Screenshot</Text>
            <Text style={{ color: Colors.muted, fontSize: 12, marginBottom: 15 }}>Enter the details of the payment you made.</Text>

            <Text style={[styles.label, { color: Colors.muted }]}>Month & Year</Text>
            <View style={styles.catRow}>
              {(() => {
                const months = []
                for (let i = 0; i < 4; i++) {
                  const d = new Date()
                  d.setMonth(d.getMonth() - i)
                  months.push(d.toISOString().substring(0, 7))
                }
                return months.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.catBtn, { borderColor: Colors.border }, manualMonth === m && { backgroundColor: Colors.primary + '20', borderColor: Colors.primary }]}
                    onPress={() => setManualMonth(m)}
                  >
                    <Text style={{ fontSize: 11, color: manualMonth === m ? Colors.primary : Colors.text }}>{m}</Text>
                  </TouchableOpacity>
                ))
              })()}
            </View>

            <Text style={[styles.label, { color: Colors.muted, marginTop: 15 }]}>Amount Paid (₹)</Text>
            <View style={[styles.inputFrame, { borderColor: Colors.border, backgroundColor: Colors.bg }]}>
              <Text style={{ color: Colors.muted }}>₹</Text>
              <TextInput style={{ flex: 1, color: Colors.text, padding: 8 }} placeholder="2000" placeholderTextColor={Colors.muted} keyboardType="numeric" value={manualAmount} onChangeText={setManualAmount} />
            </View>

            <TouchableOpacity 
              style={[styles.actionBtn, { borderColor: Colors.primary, borderWidth: 1, marginTop: 20 }]} 
              onPress={handlePickImage}
              disabled={uploading || !manualMonth || !manualAmount}
            >
              {uploading ? <ActivityIndicator size="small" color={Colors.primary} /> : <UploadCloud size={16} color={Colors.primary} />}
              <Text style={{ color: Colors.primary, fontWeight: '600' }}>Pick & Upload Receipt</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ padding: 12, alignItems: 'center', marginTop: 10 }} 
              onPress={() => { setIsManual(false); setManualMonth(''); setManualAmount('') }}
            >
              <Text style={{ color: Colors.muted }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Confirmation Success Popup */}
      <Modal visible={showPopup} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.popupCard, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
            <CheckCircle2 size={48} color={Colors.green} />
            <Text style={[styles.popupTitle, { color: Colors.text, marginTop: 15 }]}>Submission Successful</Text>
            <Text style={[styles.popupSub, { color: Colors.muted, textAlign: 'center', marginTop: 10 }]}>
              Payment status will be updated within 2-12 hours after verification.
            </Text>
            <TouchableOpacity onPress={() => setShowPopup(false)} style={[styles.popupBtn, { backgroundColor: Colors.primary }]}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontFamily: 'Outfit_700Bold', marginLeft: 15 },
  scroll: { padding: 20 },
  qrCard: { borderRadius: 20, borderWidth: 1, padding: 25, alignItems: 'center', gap: 10, marginBottom: 25 },
  qrTitle: { fontSize: 16, fontFamily: 'Outfit_700Bold' },
  qrSub: { fontSize: 13 },
  sectionTitle: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'Outfit_600SemiBold', marginBottom: 12 },
  recordList: { gap: 10 },
  recordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderRadius: 16, borderWidth: 1 },
  monthText: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  payBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  
  staticPayBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginTop: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addManualBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 24, borderWidth: 1, padding: 24 },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', marginBottom: 5 },
  label: { fontSize: 12, marginBottom: 6 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  inputFrame: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 14, borderRadius: 12 },
  
  popupCard: { width: '85%', padding: 25, borderRadius: 24, borderWidth: 1, alignItems: 'center', alignSelf: 'center' },
  popupTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold' },
  popupSub: { fontSize: 13, marginBottom: 20 },
  popupBtn: { paddingVertical: 12, paddingHorizontal: 40, borderRadius: 12 }
})
