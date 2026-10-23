import { useState, useEffect, useRef } from 'react'
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { C } from '../lib/theme'

const H = 44
const VISIBLE = 5
const PAD = H * 2
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function Wheel({ items, index, onChange }: { items: string[]; index: number; onChange: (i: number) => void }) {
  const ref = useRef<ScrollView>(null)
  useEffect(() => { setTimeout(() => ref.current?.scrollTo({ y: index * H, animated: false }), 0) }, [])
  const settle = (y: number) => onChange(Math.max(0, Math.min(items.length - 1, Math.round(y / H))))
  return (
    <ScrollView ref={ref} style={{ height: H * VISIBLE, flex: 1 }} showsVerticalScrollIndicator={false}
      snapToInterval={H} decelerationRate="fast" contentContainerStyle={{ paddingVertical: PAD }}
      onMomentumScrollEnd={e => settle(e.nativeEvent.contentOffset.y)}
      onScrollEndDrag={e => settle(e.nativeEvent.contentOffset.y)}>
      {items.map((it, i) => (
        <View key={i} style={{ height: H, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: i === index ? C.white : C.muted, fontSize: i === index ? 20 : 16 }}>{it}</Text>
        </View>
      ))}
    </ScrollView>
  )
}

function Sheet({ value, onClose, onPick }: { value: string; onClose: () => void; onPick: (v: string) => void }) {
  const maxYear = new Date().getFullYear() - 18
  const years: string[] = []
  for (let y = maxYear; y >= 1920; y--) years.push(String(y))
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  const [d, setD] = useState(m ? Math.max(0, +m[1] - 1) : 0)
  const [mo, setMo] = useState(m ? Math.max(0, +m[2] - 1) : 0)
  const [yr, setYr] = useState(m ? Math.max(0, maxYear - +m[3]) : Math.min(years.length - 1, maxYear - 2000))

  const confirm = () => {
    const year = +years[yr]
    const maxDay = new Date(year, mo + 1, 0).getDate()
    const day = Math.min(d + 1, maxDay)
    onPick(`${String(day).padStart(2, '0')}/${String(mo + 1).padStart(2, '0')}/${year}`)
  }

  return (
    <View style={s.backdrop}>
      <View style={s.sheet}>
        <Text style={s.title}>Date of birth</Text>
        <View style={{ height: H * VISIBLE, justifyContent: 'center' }}>
          <View pointerEvents="none" style={s.band} />
          <View style={{ flexDirection: 'row' }}>
            <Wheel items={days} index={d} onChange={setD} />
            <Wheel items={MONTHS} index={mo} onChange={setMo} />
            <Wheel items={years} index={yr} onChange={setYr} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <TouchableOpacity style={[s.btn, { backgroundColor: 'rgba(255,255,255,0.08)' }]} onPress={onClose}>
            <Text style={{ color: C.white }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: C.gold }]} onPress={confirm}>
            <Text style={{ color: '#0C0817', fontWeight: '600' }}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

export default function DateWheel({ visible, value, onClose, onPick }:
  { visible: boolean; value: string; onClose: () => void; onPick: (v: string) => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {visible && <Sheet value={value} onClose={onClose} onPick={onPick} />}
    </Modal>
  )
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 30 },
  title: { color: C.white, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  band: { position: 'absolute', left: 0, right: 0, top: H * 2, height: H, borderRadius: 10, backgroundColor: 'rgba(201,164,106,0.15)' },
  btn: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center' },
})