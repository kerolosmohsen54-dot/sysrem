import React, { useState } from 'react';
import { ActivityIndicator, Button, Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Channel } from '../api/channels';
import { createManualDeposit, createMobileCustomer, searchCustomers, Customer, errorDetailsText } from '../api/messages';
import { newIdempotencyKey } from '../api/http';
import { useAuth } from '../auth/AuthContext';

function localToday(){const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function ManualDepositScreen(){
  const {api}=useAuth();const navigation=useNavigation<any>();const client=useQueryClient();
  const [amount,setAmount]=useState('');const [date,setDate]=useState(localToday());const [note,setNote]=useState('');const [customer,setCustomer]=useState<Customer|null>(null);const [channel,setChannel]=useState<Channel|null>(null);
  const [search,setSearch]=useState('');const [picker,setPicker]=useState(false);const [creatingCustomer,setCreatingCustomer]=useState(false);const [newCustomerName,setNewCustomerName]=useState('');const [newCustomerPhone,setNewCustomerPhone]=useState('');const [customerError,setCustomerError]=useState('');
  const [key,setKey]=useState(newIdempotencyKey());const [error,setError]=useState('');const [success,setSuccess]=useState('');
  const customers=useQuery({queryKey:['customers',search],queryFn:()=>searchCustomers(api,search),enabled:picker});
  const channels=useQuery({queryKey:['channels','postal'],queryFn:()=>api.get<any>('/mobile/channels?type=postal&per_page=100')});
  const mutation=useMutation({mutationFn:(input:{customer_id:number;amount:string;date:string;note?:string;channel_id?:number})=>createManualDeposit(api,input,key),onSuccess:()=>client.invalidateQueries({queryKey:['channels']})});
  const postal:Channel[]=(channels.data?.data??[]).filter((item:any)=>!item.paused&&item.status!=='paused'&&(item.type==='postal'||item.channel_type==='post_office'));
  async function submit(){setError('');setSuccess('');if(!/^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/.test(amount)||/^0+(?:\.0{1,2})?$/.test(amount))return setError('أدخل مبلغاً موجباً بصيغة عشرية');if(!customer)return setError('اختر العميل');if(!postal.length)return setError('لا يوجد حساب بريدي نشط');if(postal.length>1&&!channel)return setError('اختر الحساب البريدي');try{const response=await mutation.mutateAsync({customer_id:customer.id,amount,date:date.trim()||localToday(),note:note.trim()||undefined,channel_id:postal.length>1?channel?.id:undefined});setSuccess(`تم حفظ الإيداع رقم ${response.data.id} بمصدر ${response.data.source}`);setKey(newIdempotencyKey());setAmount('');setDate(localToday());setNote('');}catch(cause){setError(errorDetailsText(cause));}}
  async function saveCustomer(){setCustomerError('');if(!newCustomerName.trim()){setCustomerError('اسم العميل مطلوب');return;}try{const response=await createMobileCustomer(api,{name:newCustomerName.trim(),phone:newCustomerPhone.trim()||undefined});setCustomer(response.data);setPicker(false);setCreatingCustomer(false);setNewCustomerName('');setNewCustomerPhone('');}catch(cause){setCustomerError(errorDetailsText(cause));}}
  return <SafeAreaView style={{flex:1,backgroundColor:'#f5f7fb',padding:18}}>
    <View style={{flexDirection:'row-reverse',justifyContent:'space-between',alignItems:'center'}}><Button title="رجوع" onPress={()=>navigation.goBack()}/><Text accessibilityRole="header" style={{fontSize:22,fontWeight:'700'}}>إيداع بريدي يدوي</Text></View>
    <Text style={label}>المبلغ</Text><TextInput accessibilityLabel="مبلغ الإيداع" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" style={input}/>
    <Text style={label}>العميل</Text><Button title={customer?.name??'اختر العميل'} onPress={()=>setPicker(true)}/>
    <Text style={label}>التاريخ (اختياري — اليوم افتراضيًا)</Text><TextInput accessibilityLabel="تاريخ الإيداع (اختياري)" value={date} onChangeText={setDate} placeholder="اتركه فارغًا لاستخدام تاريخ اليوم" style={input}/>
    <Text style={label}>ملاحظة اختيارية</Text><TextInput accessibilityLabel="ملاحظة الإيداع" value={note} onChangeText={setNote} style={input}/>
    {postal.length>1?<View><Text style={label}>الحساب البريدي</Text>{postal.map(item=><Button key={item.id} title={item.name} onPress={()=>setChannel(item)}/>)}</View>:null}
    {error?<Text accessibilityRole="alert" style={{color:'#b42318',marginVertical:10}}>{error}</Text>:null}{success?<Text accessibilityRole="alert" style={{color:'#027a48',marginVertical:10}}>{success}</Text>:null}
    <Button title="حفظ الإيداع" onPress={()=>{void submit();}} disabled={mutation.isPending}/>
    <Modal visible={picker} animationType="slide" onRequestClose={()=>setPicker(false)}><SafeAreaView style={{flex:1,padding:16}}><Text accessibilityRole="header" style={{fontSize:22,textAlign:'right'}}>اختر العميل</Text>
      {!creatingCustomer?<><TextInput accessibilityLabel="بحث عن عميل" placeholder="ابحث بالاسم" value={search} onChangeText={setSearch} style={input}/><Button title="إنشاء عميل جديد" onPress={()=>setCreatingCustomer(true)}/></>:null}
      {creatingCustomer?<><TextInput accessibilityLabel="اسم العميل الجديد" placeholder="اسم العميل" value={newCustomerName} onChangeText={setNewCustomerName} style={input}/><TextInput accessibilityLabel="هاتف العميل الجديد" placeholder="الهاتف (اختياري)" value={newCustomerPhone} onChangeText={setNewCustomerPhone} style={input}/><Button title="حفظ العميل" onPress={()=>{void saveCustomer();}}/></>:null}
      {customerError?<Text accessibilityRole="alert" style={{color:'#b42318'}}>{customerError}</Text>:null}{customers.isLoading?<ActivityIndicator accessibilityLabel="تحميل العملاء"/>:null}
      {!creatingCustomer?<ScrollView>{(customers.data?.data??[]).map(customer=><Button key={customer.id} title={customer.name} onPress={()=>{setCustomer(customer);setPicker(false);}}/>)}</ScrollView>:null}<Button title="إلغاء" onPress={()=>setPicker(false)}/>
    </SafeAreaView></Modal>
  </SafeAreaView>;
}
const label={textAlign:'right' as const,fontWeight:'600' as const,marginTop:16,marginBottom:6};const input={borderWidth:1,borderColor:'#cbd5e1',borderRadius:9,padding:12,backgroundColor:'white'};
